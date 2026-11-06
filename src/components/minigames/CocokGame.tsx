"use client";

// =====================================================
// CocokGame — Cocok Warna (solo)
//
// 45 detik. Tap SEMUA kotak berwarna target. Tiap benar +5, ronde beres
// +10, salah tap -5.
// =====================================================

import { useRef, useState } from "react";
import { COCOK_COLORS, COCOK_SECONDS, buildCocokRounds, type CocokRound } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const nowMs = () => Date.now();

export function CocokGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "cocok");

  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<CocokRound[]>([]);
  const [round, setRound] = useState(0);
  const [taken, setTaken] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COCOK_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    const r = buildCocokRounds();
    setRounds(r);
    setRound(0);
    setTaken(r[0][1].map(() => false));
    setScore(0);
    setDone(0);
    setIsRecord(false);
    setTimeLeft(COCOK_SECONDS);
    endRef.current = nowMs() + COCOK_SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const tap = (i: number) => {
    const [target, cells] = rounds[round];
    if (taken[i]) return;
    if (cells[i] !== target) {
      setScore((s) => Math.max(0, s - 5));
      return;
    }
    const nextTaken = taken.map((t, k) => (k === i ? true : t));
    const left = cells.filter((c, k) => c === target && !nextTaken[k]).length;
    if (left > 0) {
      setTaken(nextTaken);
      setScore((s) => s + 5);
      return;
    }
    // Ronde beres.
    const gained = 15;
    setDone((d) => d + 1);
    if (round + 1 >= rounds.length) {
      finish(score + gained);
      return;
    }
    setScore((s) => s + gained);
    setRound(round + 1);
    setTaken(rounds[round + 1][1].map(() => false));
  };

  if (phase === "start") return <StartCard game="cocok" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return <ResultCard game="cocok" score={score} best={best} isRecord={isRecord} stats={`${done} ronde selesai`} onAgain={start} />;
  }

  const [target, cells] = rounds[round];
  const cols = cells.length === 9 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="max-w-xs mx-auto select-none">
      <Hud score={score} combo={0} fraction={timeLeft / COCOK_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-sm font-bold text-slate-500">
        Tap semua yang berwarna{" "}
        <span className="inline-flex items-center gap-1 text-base font-black text-slate-900">
          <span className={`inline-block w-4 h-4 rounded-full ${COCOK_COLORS[target].cls}`} />
          {COCOK_COLORS[target].name.toUpperCase()}
        </span>
      </p>
      <div className={`grid ${cols} gap-2`}>
        {cells.map((c, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            aria-label={COCOK_COLORS[c].name}
            disabled={taken[i]}
            onPointerDown={() => tap(i)}
            className={`aspect-square rounded-xl transition ${COCOK_COLORS[c].cls} ${
              taken[i] ? "opacity-15 scale-75" : "active:scale-90"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
