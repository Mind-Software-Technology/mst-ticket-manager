"use client";

// =====================================================
// TarikRace — Tarik Tambang (multiplayer)
//
// Pemain dibagi dua tim berdasarkan urutan masuk (genap = Merah, ganjil
// = Biru). 20 detik, ketuk sebanyak mungkin. Posisi tali dihitung dari
// rata-rata ketukan per pemain tiap tim, yang disiarkan lewat `prog`.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { avatarFor, MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { TARIK_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const SYNC_MS = 150;
/** Selisih rata-rata ketukan yang membuat tali menyentuh sisi paling ujung. */
const ROPE_SPAN = 40;

const TEAMS = [
  { name: "Merah", emoji: "🔴", bar: "bg-red-500", text: "text-red-600", soft: "bg-red-50 border-red-200" },
  { name: "Biru", emoji: "🔵", bar: "bg-blue-500", text: "text-blue-600", soft: "bg-blue-50 border-blue-200" },
] as const;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function TarikRace({
  room,
  me,
  config,
  onLobby,
  onLeave,
}: {
  room: RoomApi;
  me: MpPlayer;
  config: StartPayload;
  onLobby: () => void;
  onLeave: () => void;
}) {
  const joined = config.players;
  const { subscribe } = room;
  const teamOf = (id: string) => Math.max(0, joined.findIndex((p) => p.id === id)) % 2;
  const myTeam = teamOf(me.id);

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TARIK_SECONDS);
  /** Ketukan pemain lain (dari siaran prog). */
  const [others, setOthers] = useState<Record<string, number>>({});

  const startRef = useRef(0);
  const tapsRef = useRef(0);
  const sentRef = useRef(-1);
  const doneSent = useRef(false);
  const stageRef = useRef<Stage>("countdown");

  useEffect(() => {
    stageRef.current = stage;
  });

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, taps, stage === "done");

  useEffect(
    () =>
      subscribe((m) => {
        if (m.t === "prog") setOthers((prev) => ({ ...prev, [m.id]: m.n }));
      }),
    [subscribe],
  );

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: tapsRef.current, n: tapsRef.current, done: true });
  };

  const tap = () => {
    if (stageRef.current !== "play") return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
  };

  // Spasi / Enter juga mengetuk (tahan tombol tidak dihitung berulang).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useInterval(
    () => {
      if (count <= 1) {
        startRef.current = nowMs();
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const ms = nowMs() - startRef.current;
      if (ms >= TARIK_SECONDS * 1000) {
        setTimeLeft(0);
        finish();
      } else setTimeLeft(TARIK_SECONDS - ms / 1000);
    },
    stage === "play" ? 50 : null,
  );

  useInterval(
    () => {
      if (tapsRef.current === sentRef.current) return;
      sentRef.current = tapsRef.current;
      room.send({ t: "prog", id: me.id, score: tapsRef.current, n: tapsRef.current });
    },
    stage === "play" ? SYNC_MS : null,
  );

  const tapsOf = (id: string) => (id === me.id ? taps : (others[id] ?? 0));
  const members = [0, 1].map((t) => joined.filter((p) => teamOf(p.id) === t));
  const avg = members.map((list) => (list.length ? list.reduce((s, p) => s + tapsOf(p.id), 0) / list.length : 0));
  const total = members.map((list) => list.reduce((s, p) => s + tapsOf(p.id), 0));
  // 0 = tali di sisi Merah (kiri), 1 = sisi Biru (kanan). Tim yang menarik lebih kuat menarik tali ke sisinya.
  const rope = Math.max(0, Math.min(1, 0.5 + (avg[0] - avg[1]) / (2 * ROPE_SPAN)));
  const leader = avg[0] === avg[1] ? null : avg[0] > avg[1] ? 0 : 1;

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={
          leader === null
            ? "Seri! Kedua tim sama kuat. 🤝"
            : `Tim ${TEAMS[leader].name} ${TEAMS[leader].emoji} menang! Rata-rata ${avg[leader].toFixed(1)} vs ${avg[1 - leader].toFixed(1)} ketukan per pemain.`
        }
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.tarik.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tarik Tambang</h3>
        <p className="mt-1 text-sm text-slate-500">
          Kamu di Tim <b className={TEAMS[myTeam].text}>{TEAMS[myTeam].name}</b> {TEAMS[myTeam].emoji}. Ketuk secepatnya!
        </p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Ketukanmu <span className="text-xl font-black text-indigo-600">{taps}</span>
        </span>
        {stage === "done" ? (
          <span className="text-emerald-600">Selesai</span>
        ) : (
          <span className={timeLeft < 5 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {timeLeft.toFixed(1)}s</span>
        )}
      </div>

      <div className="rounded-2xl bg-slate-800 p-3">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-red-400">🔴 Merah · {total[0]}</span>
          <span className="text-blue-400">{total[1]} · Biru 🔵</span>
        </div>
        <div className="relative mt-2 h-10 overflow-hidden rounded-xl bg-slate-700">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-red-500/25" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-500/25" />
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
          <div className="absolute inset-y-0 left-0 w-full transition-[padding] duration-200 ease-out" style={{ paddingLeft: `calc((100% - 2rem) * ${rope})` }}>
            <span className="inline-block text-3xl leading-10">🪢</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {members.map((list, t) => (
            <div key={t} className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold ${TEAMS[t].soft} ${t === myTeam ? "ring-2 ring-yellow-400" : ""}`}>
              <p className={TEAMS[t].text}>Tim {TEAMS[t].name}</p>
              <p className="mt-0.5 truncate text-slate-600">
                {list.map((p) => `${avatarFor(p.id)} ${p.id === me.id ? "Kamu" : p.name}`).join(", ")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {stage === "play" ? (
        <button
          type="button"
          onPointerDown={tap}
          aria-label="Tarik"
          className={`mt-4 flex h-44 w-full touch-none items-center justify-center rounded-3xl text-6xl text-white shadow-xl transition-transform duration-75 active:scale-95 ${TEAMS[myTeam].bar}`}
        >
          💪
        </button>
      ) : (
        <p className="mt-4 text-center text-sm font-bold text-slate-600">Selesai! Menunggu pemain lain…</p>
      )}

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
