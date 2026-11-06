"use client";

// =====================================================
// BalokRace — Tumpuk Balok (multiplayer)
//
// Tiap pemain menumpuk balok sendiri selama 60 detik; skor disiarkan
// langsung. Balok meleset total = selesai lebih awal.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const SECONDS = 60;
const START_WIDTH = 40;
const PERFECT_TOL = 1.2;
const VISIBLE = 10;

const nowMs = () => Date.now();

interface Slab {
  left: number;
  width: number;
}

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BalokRace({
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
  const [stack, setStack] = useState<Slab[]>([{ left: (100 - START_WIDTH) / 2, width: START_WIDTH }]);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);

  const startRef = useRef(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const width = stack[stack.length - 1].width;
  const speed = 1.4 + Math.min(stack.length, 40) * 0.07;

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: stack.length - 1, done: true });
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
      if (ms >= SECONDS * 1000) {
        setTimeLeft(0);
        finish();
        return;
      }
      setTimeLeft(SECONDS - ms / 1000);
      let p = posRef.current + dirRef.current * speed;
      const max = 100 - width;
      if (p >= max) {
        p = max;
        dirRef.current = -1;
      } else if (p <= 0) {
        p = 0;
        dirRef.current = 1;
      }
      posRef.current = p;
      setPos(p);
    },
    stage === "play" ? 25 : null,
  );

  const drop = () => {
    if (stage !== "play") return;
    const top = stack[stack.length - 1];
    const left = posRef.current;
    const overlap = Math.min(left + width, top.left + top.width) - Math.max(left, top.left);
    if (overlap <= 0) {
      finish();
      return;
    }
    const perfect = Math.abs(left - top.left) <= PERFECT_TOL;
    const slab: Slab = perfect ? { left: top.left, width: top.width } : { left: Math.max(left, top.left), width: overlap };
    scoreRef.current += 10 + (perfect ? 15 : 0);
    setScore(scoreRef.current);
    setStack((s) => [...s, slab]);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: stack.length });
  };

  useEffect(() => {
    if (stage !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Perfect berturut-turut menjaga balokmu tetap lebar."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.balok.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tumpuk Balok</h3>
        <p className="mt-1 text-sm text-slate-500">Bangun menara setinggi mungkin dalam 60 detik!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">🏁 Menara selesai di lantai {stack.length - 1}! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const shown = stack.slice(-VISIBLE);
  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Lantai {stack.length - 1}</span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <button
        type="button"
        onPointerDown={drop}
        aria-label="Jatuhkan balok"
        className="relative block w-full h-72 rounded-2xl bg-gradient-to-b from-sky-200 to-indigo-100 overflow-hidden touch-none"
      >
        <div
          className="absolute h-6 rounded bg-amber-500 shadow"
          style={{ left: `${pos}%`, width: `${width}%`, bottom: `${shown.length * 24 + 8}px` }}
        />
        {shown.map((s, i) => (
          <div
            key={stack.length - shown.length + i}
            className="absolute h-6 rounded bg-indigo-500 border border-indigo-700/40"
            style={{ left: `${s.left}%`, width: `${s.width}%`, bottom: `${i * 24 + 8}px` }}
          />
        ))}
      </button>
      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
