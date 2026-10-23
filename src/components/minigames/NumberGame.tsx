"use client";

// =====================================================
// NumberGame — Sentuh Angka (solo)
//
// Tap angka 1-16 berurutan secepat mungkin (batas 45 detik).
// 20 poin per angka benar, selesai semua = bonus sisa waktu.
// =====================================================

import { useRef, useState } from "react";
import { NUMBER_COUNT, NUMBER_SECONDS, buildNumberGrid, numberScore } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function NumberGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "angka");

  const [phase, setPhase] = useState<Phase>("start");
  const [grid, setGrid] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [score, setScore] = useState(0);
  const [slips, setSlips] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(NUMBER_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef(0);

  const start = () => {
    setGrid(buildNumberGrid());
    setNext(1);
    setScore(0);
    setSlips(0);
    setIsRecord(false);
    setTimeLeft(NUMBER_SECONDS);
    startRef.current = nowMs();
    setPhase("play");
  };

  const finish = (final: number, ms: number) => {
    setScore(final);
    setElapsed(ms);
    setIsRecord(submit(final));
    setPhase("result");
  };

  useInterval(
    () => {
      const ms = nowMs() - startRef.current;
      if (ms >= NUMBER_SECONDS * 1000) {
        setTimeLeft(0);
        finish(numberScore(next - 1, ms), ms);
      } else setTimeLeft(NUMBER_SECONDS - ms / 1000);
    },
    phase === "play" ? 100 : null,
  );

  const tap = (n: number) => {
    if (n !== next) {
      setSlips((s) => s + 1);
      setFlash(n);
      setTimeout(() => setFlash(null), 200);
      return;
    }
    const ms = nowMs() - startRef.current;
    setNext(n + 1);
    setScore(numberScore(n, ms));
    if (n >= NUMBER_COUNT) finish(numberScore(n, ms), ms);
  };

  if (phase === "start") return <StartCard game="angka" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="angka"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={
          next > NUMBER_COUNT
            ? `Selesai dalam ${(elapsed / 1000).toFixed(1)} detik · ${slips} salah tap`
            : `${next - 1}/${NUMBER_COUNT} angka · ${slips} salah tap`
        }
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto select-none">
      <Hud score={score} combo={0} fraction={timeLeft / NUMBER_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-sm font-bold text-slate-500">
        Cari angka <span className="text-2xl font-black text-indigo-600">{next}</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {grid.map((n) => {
          const done = n < next;
          return (
            <button
              key={n}
              type="button"
              disabled={done}
              onPointerDown={() => tap(n)}
              className={`aspect-square rounded-xl text-2xl font-black transition active:scale-95 ${
                done
                  ? "bg-slate-100 text-slate-300"
                  : flash === n
                    ? "bg-red-500 text-white"
                    : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
