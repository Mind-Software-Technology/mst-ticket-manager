"use client";

// =====================================================
// SentuhGame — Sentuh Angka (solo)
//
// 60 detik. Tap angka 1..25 berurutan. Benar +10, salah -3; semua selesai
// menambah bonus sisa waktu.
// =====================================================

import { useRef, useState } from "react";
import { SENTUH_COUNT, SENTUH_SECONDS, buildSentuhGrid } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const nowMs = () => Date.now();

export function SentuhGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "sentuh");

  const [phase, setPhase] = useState<Phase>("start");
  const [grid, setGrid] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(SENTUH_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setGrid(buildSentuhGrid());
    setNext(1);
    setScore(0);
    setIsRecord(false);
    setTimeLeft(SENTUH_SECONDS);
    endRef.current = nowMs() + SENTUH_SECONDS * 1000;
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

  const tap = (n: number) => {
    if (n !== next) {
      setScore((s) => Math.max(0, s - 3));
      setWrong(n);
      setTimeout(() => setWrong(null), 250);
      return;
    }
    if (n >= SENTUH_COUNT) {
      finish(score + 10 + Math.floor((endRef.current - nowMs()) / 1000) * 5);
      return;
    }
    setScore((s) => s + 10);
    setNext(n + 1);
  };

  if (phase === "start") return <StartCard game="sentuh" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="sentuh"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${next - 1}/${SENTUH_COUNT} angka`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <Hud score={score} combo={0} fraction={timeLeft / SENTUH_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-sm font-bold text-slate-500">
        Cari: <span className="text-2xl font-black text-indigo-600">{next}</span>
      </p>
      <div className="grid grid-cols-5 gap-2">
        {grid.map((n) => (
          <button
            key={n}
            type="button"
            disabled={n < next}
            onPointerDown={() => tap(n)}
            className={`aspect-square rounded-xl text-lg font-black transition ${
              n < next
                ? "bg-emerald-100 text-emerald-300"
                : wrong === n
                  ? "bg-red-500 text-white"
                  : "bg-white border border-slate-200 text-slate-800 active:scale-90"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
