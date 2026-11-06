"use client";

// =====================================================
// BidikGame — Bidik Target (solo)
//
// 30 detik. Target muncul satu per satu di posisi acak dan cepat hilang.
// Tap target = +10 (+ bonus kalau cepat), tap area kosong = -2.
// =====================================================

import { useRef, useState } from "react";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

const SECONDS = 30;
const nowMs = () => Date.now();
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Target {
  x: number; // persen
  y: number; // persen
  born: number;
  life: number; // ms
}

const spawn = (hits: number): Target => ({
  x: rand(8, 92),
  y: rand(10, 90),
  born: nowMs(),
  life: Math.max(650, 1500 - hits * 40),
});

export function BidikGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "bidik");

  const [phase, setPhase] = useState<Phase>("start");
  const [target, setTarget] = useState<Target | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    setTarget(spawn(0));
    endRef.current = nowMs() + SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const t = nowMs();
      const left = (endRef.current - t) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
        return;
      }
      setTimeLeft(left);
      if (target && t - target.born > target.life) {
        setCombo(0);
        setTarget(spawn(hits));
      }
    },
    phase === "play" ? 50 : null,
  );

  const hit = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!target) return;
    const speedBonus = Math.max(0, Math.round((1 - (nowMs() - target.born) / target.life) * 10));
    const c = combo + 1;
    setScore((s) => s + 10 + speedBonus + (c >= 5 ? 5 : 0));
    setCombo(c);
    setHits((h) => h + 1);
    setTarget(spawn(hits + 1));
  };

  const missTap = () => {
    setScore((s) => Math.max(0, s - 2));
    setCombo(0);
    setMisses((m) => m + 1);
  };

  if (phase === "start") return <StartCard game="bidik" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="bidik"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} kena · ${misses} meleset`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div
        onPointerDown={missTap}
        className="relative h-72 rounded-2xl bg-slate-800 overflow-hidden touch-none cursor-crosshair"
      >
        {target && (
          <button
            type="button"
            aria-label="Target"
            onPointerDown={hit}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-red-400 to-rose-600 ring-4 ring-white/80 shadow-lg text-2xl active:scale-90"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            🎯
          </button>
        )}
      </div>
    </div>
  );
}
