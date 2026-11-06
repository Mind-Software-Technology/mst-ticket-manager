"use client";

// =====================================================
// BalokGame — Tumpuk Balok (solo)
//
// Balok bergerak kiri-kanan. Tap (atau Spasi) untuk menjatuhkannya di atas
// tumpukan. Bagian yang menjorok terpotong; tidak menumpuk sama sekali = selesai.
// Tiap lantai +10, tumpukan nyaris pas (perfect) +15 tambahan.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

interface Slab {
  left: number; // persen 0..100
  width: number;
}

const START_WIDTH = 40;
const PERFECT_TOL = 1.2;
const VISIBLE = 12;

export function BalokGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "balok");

  const [phase, setPhase] = useState<Phase>("start");
  const [stack, setStack] = useState<Slab[]>([]);
  const [pos, setPos] = useState(0);
  const [score, setScore] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const dirRef = useRef(1);
  const posRef = useRef(0);

  const speed = 1.4 + Math.min(stack.length, 40) * 0.07;
  const width = stack.length ? stack[stack.length - 1].width : START_WIDTH;

  const start = () => {
    posRef.current = 0;
    dirRef.current = 1;
    setPos(0);
    setStack([{ left: (100 - START_WIDTH) / 2, width: START_WIDTH }]);
    setScore(0);
    setPerfects(0);
    setIsRecord(false);
    setPhase("play");
  };

  useInterval(
    () => {
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
    phase === "play" ? 25 : null,
  );

  const drop = () => {
    if (phase !== "play") return;
    const top = stack[stack.length - 1];
    const left = posRef.current;
    const overlapL = Math.max(left, top.left);
    const overlapR = Math.min(left + width, top.left + top.width);
    const overlap = overlapR - overlapL;
    if (overlap <= 0) {
      setIsRecord(submit(score));
      setPhase("result");
      return;
    }
    const perfect = Math.abs(left - top.left) <= PERFECT_TOL;
    const slab: Slab = perfect ? { left: top.left, width: top.width } : { left: overlapL, width: overlap };
    setStack((s) => [...s, slab]);
    setScore((s) => s + 10 + (perfect ? 15 : 0));
    if (perfect) setPerfects((n) => n + 1);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "start") return <StartCard game="balok" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="balok"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${stack.length - 1} lantai · ${perfects} perfect`}
        onAgain={start}
      />
    );
  }

  const shown = stack.slice(-VISIBLE);
  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className="text-slate-500">Lantai {stack.length - 1}</span>
      </div>
      <button
        type="button"
        onPointerDown={drop}
        aria-label="Jatuhkan balok"
        className="relative block w-full h-80 rounded-2xl bg-gradient-to-b from-sky-200 to-indigo-100 overflow-hidden touch-none"
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
      <p className="mt-2 text-center text-xs text-slate-400">Tap area / Spasi untuk menjatuhkan</p>
    </div>
  );
}
