"use client";

// =====================================================
// RunRace — Lomba Lari (multiplayer)
//
// Tap KIRI/KANAN bergantian untuk berlari. Posisi semua pemain
// disiarkan langsung dan terlihat di lintasan. Skor: <100 = jarak
// tempuh saat waktu habis; >=100 = sampai finish (100 + bonus waktu).
// =====================================================

import { useEffect, useRef, useState } from "react";
import { avatarFor, MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
type Side = "L" | "R";

const COUNTDOWN = 3;
const LIMIT_SECONDS = 30;
const STEP = 1.6;
const SEND_EVERY_MS = 120;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function RunRace({
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

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [pos, setPos] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LIMIT_SECONDS);
  const [stumble, setStumble] = useState(false);
  const [finishScore, setFinishScore] = useState<number | null>(null);

  const posRef = useRef(0);
  const lastSide = useRef<Side | null>(null);
  const lastSent = useRef(0);
  const startRef = useRef(0);
  const doneSent = useRef(false);
  const tapRef = useRef<(side: Side) => void>(() => {});

  const myScore = finishScore ?? Math.round(pos);
  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, myScore, stage === "done");

  useInterval(
    () => {
      if (count <= 1) {
        startRef.current = nowMs();
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  const finish = (score: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setFinishScore(score);
    setStage("done");
    room.send({ t: "prog", id: me.id, score, n: 0, done: true });
  };

  useInterval(
    () => {
      const left = LIMIT_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(Math.round(posRef.current));
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  useEffect(() => {
    tapRef.current = (side) => {
      if (stage !== "play") return;
      if (side === lastSide.current) {
        // Sisi sama dua kali: tersandung.
        setStumble(true);
        setTimeout(() => setStumble(false), 250);
        return;
      }
      lastSide.current = side;
      posRef.current = Math.min(100, posRef.current + STEP);
      setPos(posRef.current);

      if (posRef.current >= 100) {
        const remaining = Math.max(0, LIMIT_SECONDS - (nowMs() - startRef.current) / 1000);
        finish(100 + Math.round((remaining / LIMIT_SECONDS) * 100));
        return;
      }
      const now = nowMs();
      if (now - lastSent.current >= SEND_EVERY_MS) {
        lastSent.current = now;
        room.send({ t: "prog", id: me.id, score: Math.round(posRef.current), n: 0 });
      }
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "arrowleft") tapRef.current("L");
      else if (k === "j" || k === "arrowright") tapRef.current("R");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Skor 100+ = sampai finish (makin besar makin cepat). Di bawah 100 = jarak tempuh."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.lari.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Lomba Lari</h3>
        <p className="mt-1 text-sm text-slate-500">Tap kiri-kanan bergantian. Siap di garis start!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  const progressOf = (id: string) => Math.min(100, id === me.id ? pos : (scores[id] ?? 0));
  const lanes = [...joined].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <div className="max-w-xl mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">{Math.round(pos)}%</span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <div className="rounded-2xl bg-slate-900 p-3 space-y-2">
        {lanes.map((p) => {
          const pct = progressOf(p.id);
          const finished = (scores[p.id] ?? 0) >= 100 || (p.id === me.id && finishScore !== null && finishScore >= 100);
          return (
            <div key={p.id} className="relative h-9 rounded-lg bg-slate-800 overflow-hidden">
              <div className="absolute inset-y-0 right-0 w-1.5 bg-[repeating-linear-gradient(45deg,#fff_0_4px,#000_4px_8px)] opacity-70" />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600/30 to-fuchsia-500/40 transition-[width] duration-150"
                style={{ width: `${pct}%` }}
              />
              <span className="absolute top-1 text-lg transition-[left] duration-150" style={{ left: `calc(${pct}% * 0.93)` }}>
                {finished ? "🏆" : avatarFor(p.id)}
              </span>
              <span className="absolute inset-y-0 right-3 flex items-center text-[11px] font-bold text-slate-300">
                {p.id === me.id ? "Kamu" : p.name}
              </span>
            </div>
          );
        })}
      </div>

      {stage === "play" ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["L", "R"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onPointerDown={() => tapRef.current(side)}
                className={`h-32 rounded-2xl text-white text-3xl font-black shadow-lg active:scale-95 transition ${
                  stumble ? "bg-red-500" : side === "L" ? "bg-gradient-to-br from-indigo-500 to-indigo-700" : "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700"
                }`}
              >
                {side === "L" ? "👟 KIRI" : "KANAN 👟"}
                <span className="block text-xs font-semibold opacity-70">{side === "L" ? "tombol F / ←" : "tombol J / →"}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-slate-400">
            {stumble ? "Tersandung! Gantian kiri-kanan 😵" : "Gantian kiri-kanan secepat mungkin!"}
          </p>
        </>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-500">
          {finishScore !== null && finishScore >= 100 ? "🏁 Kamu sampai finish!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
      )}
    </div>
  );
}
