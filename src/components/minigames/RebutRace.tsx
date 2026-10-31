"use client";

// =====================================================
// RebutRace — Rebut Angka (multiplayer)
//
// Satu papan angka 1..30 untuk semua pemain; semua mencari angka yang
// SAMA secara berurutan. Pemain yang tap angka berikutnya mengirim `claim`;
// host menjadi wasit (hanya klaim yang cocok dengan angka berikutnya yang
// diterima) dan menyiarkan `won`. Skor dihitung dari `won` yang sama di
// semua klien.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { avatarFor, MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { REBUT_COUNT, REBUT_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useDelay, useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const POINTS = 10;
const SETTLE_MS = 1500;
const HOST_GONE_MS = 5000;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function RebutRace({
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
  const grid = config.rebut ?? [];
  const joined = config.players;
  const isHost = config.hostId === me.id;
  const delay = useDelay();
  const { subscribe, send } = room;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [timeLeft, setTimeLeft] = useState(REBUT_SECONDS);
  const [next, setNext] = useState(1);
  const [claimedBy, setClaimedBy] = useState<Record<number, string>>({});
  const [wrong, setWrong] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  const startRef = useRef(0);
  const nextRef = useRef(1);
  /** Angka berikutnya menurut wasit (hanya dipakai host). */
  const hostNext = useRef(1);
  const stageRef = useRef<Stage>("countdown");
  const handler = useRef<(m: MpMessage) => void>(() => {});

  useEffect(() => {
    stageRef.current = stage;
  });

  useEffect(() => {
    handler.current = (m) => {
      if (m.t === "claim" && isHost) {
        if (m.n === hostNext.current && m.n <= REBUT_COUNT) {
          hostNext.current += 1;
          send({ t: "won", n: m.n, id: m.id });
        }
      } else if (m.t === "won") {
        if (m.n < nextRef.current) return;
        nextRef.current = m.n + 1;
        setNext(m.n + 1);
        setClaimedBy((prev) => ({ ...prev, [m.n]: m.id }));
      }
    };
  });

  useEffect(() => subscribe((m) => handler.current(m)), [subscribe]);

  const finish = () => {
    if (stageRef.current === "done") return;
    setStage("done");
    delay(() => setSettled(true), SETTLE_MS);
  };

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
      if (ms >= REBUT_SECONDS * 1000 || nextRef.current > REBUT_COUNT) {
        setTimeLeft(Math.max(0, REBUT_SECONDS - ms / 1000));
        finish();
      } else setTimeLeft(REBUT_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  // Host menghilang di tengah permainan → tidak ada wasit, selesai dengan skor saat ini.
  const hostGone = !room.players.some((p) => p.id === config.hostId);
  useEffect(() => {
    if (!hostGone || stage !== "play") return;
    const id = setTimeout(finish, HOST_GONE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostGone, stage]);

  const tap = (n: number) => {
    if (stage !== "play") return;
    if (n !== nextRef.current) {
      setWrong(n);
      setTimeout(() => setWrong(null), 200);
      return;
    }
    send({ t: "claim", n, id: me.id });
  };

  const scores: Record<string, number> = {};
  for (const p of joined) scores[p.id] = 0;
  for (const id of Object.values(claimedBy)) scores[id] = (scores[id] ?? 0) + POINTS;

  if (stage === "done" && settled) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={`${Object.keys(claimedBy).length}/${REBUT_COUNT} angka berhasil direbut.`}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.rebut.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Rebut Angka</h3>
        <p className="mt-1 text-sm text-slate-500">Semua mencari angka yang sama. Siapa tercepat, dia yang dapat!</p>
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
          Cari angka <span className="text-2xl font-black text-indigo-600">{Math.min(next, REBUT_COUNT)}</span>
        </span>
        {stage === "done" ? (
          <span className="text-emerald-600">Selesai</span>
        ) : (
          <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {grid.map((n) => {
          const owner = claimedBy[n];
          if (owner) {
            return (
              <div
                key={n}
                title={joined.find((p) => p.id === owner)?.name}
                className={`flex aspect-square items-center justify-center rounded-lg text-xl ${
                  owner === me.id ? "bg-emerald-100 ring-2 ring-emerald-400" : "bg-slate-100"
                }`}
              >
                {avatarFor(owner)}
              </div>
            );
          }
          return (
            <button
              key={n}
              type="button"
              disabled={stage !== "play"}
              onPointerDown={() => tap(n)}
              className={`aspect-square rounded-lg text-lg font-black text-white shadow transition active:scale-90 ${
                wrong === n ? "bg-red-500" : "bg-gradient-to-br from-indigo-500 to-fuchsia-500"
              } disabled:opacity-60`}
            >
              {n}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
