"use client";

// =====================================================
// SimonGame — Pola Ajaib (solo)
//
// Hafalkan urutan pad yang menyala lalu ulangi. Tiap level +1 langkah.
// Salah / kehabisan waktu = selesai. Skor = level lolos x 100.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { SIMON_MAX, buildSimonPattern } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";

type Phase = "start" | "show" | "input" | "gap" | "end";

const STEP_MS = 650;
const LIT_MS = 400;
const PADS = [
  { on: "bg-red-500", off: "bg-red-200", label: "🔴" },
  { on: "bg-sky-500", off: "bg-sky-200", label: "🔵" },
  { on: "bg-emerald-500", off: "bg-emerald-200", label: "🟢" },
  { on: "bg-amber-400", off: "bg-amber-100", label: "🟡" },
];

export function SimonGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "simon");

  const [phase, setPhase] = useState<Phase>("start");
  const [level, setLevel] = useState(1);
  const [lit, setLit] = useState<number | null>(null);
  const [entered, setEntered] = useState(0);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const pattern = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("start");
  const enteredRef = useRef(0);
  const scoreRef = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const setBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const gameOver = () => {
    clearTimers();
    setLit(null);
    setIsRecord(submit(scoreRef.current));
    setBoth("end");
  };

  const showLevel = (lv: number) => {
    setLevel(lv);
    enteredRef.current = 0;
    setEntered(0);
    setBoth("show");
    for (let i = 0; i < lv; i++) {
      later(() => setLit(pattern.current[i]), 500 + i * STEP_MS);
      later(() => setLit(null), 500 + i * STEP_MS + LIT_MS);
    }
    later(() => {
      setBoth("input");
      // Waktu mengulang: 5 detik + 1 detik per langkah.
      later(gameOver, (5 + lv) * 1000);
    }, 500 + lv * STEP_MS);
  };

  const start = () => {
    clearTimers();
    pattern.current = buildSimonPattern();
    scoreRef.current = 0;
    setScore(0);
    setIsRecord(false);
    showLevel(1);
  };

  const press = (pad: number) => {
    if (phaseRef.current !== "input") return;
    setLit(pad);
    later(() => setLit(null), 150);

    if (pattern.current[enteredRef.current] !== pad) {
      gameOver();
      return;
    }
    enteredRef.current += 1;
    setEntered(enteredRef.current);
    if (enteredRef.current >= level) {
      clearTimers();
      scoreRef.current += 100;
      setScore(scoreRef.current);
      if (level >= SIMON_MAX) {
        gameOver();
        return;
      }
      setBoth("gap");
      later(() => showLevel(level + 1), 900);
    }
  };

  if (phase === "start") return <StartCard game="simon" best={best} onStart={start} blocked={false} />;
  if (phase === "end") {
    return (
      <ResultCard
        game="simon"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${score / 100} level lolos`}
        onAgain={start}
      />
    );
  }

  const status =
    phase === "show" ? "👀 Perhatikan polanya…" : phase === "input" ? `👆 Giliranmu! ${entered}/${level}` : "✅ Benar! Level berikutnya…";

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Level {level}</span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PADS.map((p, i) => (
          <button
            key={i}
            type="button"
            disabled={phase !== "input"}
            onPointerDown={() => press(i)}
            className={`aspect-square rounded-2xl text-4xl transition-all duration-100 active:scale-95 ${
              lit === i ? `${p.on} scale-105 shadow-xl ring-4 ring-white` : p.off
            }`}
            aria-label={`Pad ${i + 1}`}
          >
            {lit === i ? p.label : ""}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-slate-600">{status}</p>
    </div>
  );
}
