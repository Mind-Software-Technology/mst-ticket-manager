"use client";

// =====================================================
// ReflexGame — Refleks Kilat (solo)
//
// 6 ronde: tunggu layar hijau lalu tap. Poin = 1000 - waktu reaksi (ms).
// Tap sebelum hijau atau terlambat = 0 poin ronde itu.
// =====================================================

import { useRef, useState } from "react";
import { REFLEX_ROUNDS, buildReflexDelays } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest, useDelay } from "./GameParts";

type Phase = "start" | "wait" | "go" | "result" | "end";

const GO_TIMEOUT_MS = 2000;
const RESULT_MS = 1400;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function ReflexGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "reflex");
  const delay = useDelay();

  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [early, setEarly] = useState(false);
  const [isRecord, setIsRecord] = useState(false);
  const [bestMs, setBestMs] = useState<number | null>(null);

  const delays = useRef<number[]>([]);
  const goAt = useRef(0);
  const scoreRef = useRef(0);
  /** Token ronde: timer lama yang sudah tidak relevan diabaikan. */
  const token = useRef(0);

  const endRound = (i: number, ms: number | null, wasEarly: boolean) => {
    token.current += 1;
    const pts = ms === null ? 0 : Math.max(0, 1000 - ms);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setLastMs(ms);
    setEarly(wasEarly);
    if (ms !== null) setBestMs((b) => (b === null ? ms : Math.min(b, ms)));
    setPhase("result");
    delay(() => {
      if (i + 1 >= REFLEX_ROUNDS) {
        setIsRecord(submit(scoreRef.current));
        setPhase("end");
      } else startRound(i + 1);
    }, RESULT_MS);
  };

  const startRound = (i: number) => {
    const mine = ++token.current;
    setRound(i);
    setEarly(false);
    setLastMs(null);
    setPhase("wait");
    delay(() => {
      if (token.current !== mine) return;
      goAt.current = nowMs();
      setPhase("go");
      delay(() => {
        if (token.current === mine) endRound(i, null, false);
      }, GO_TIMEOUT_MS);
    }, delays.current[i] ?? 2000);
  };

  const start = () => {
    delays.current = buildReflexDelays();
    scoreRef.current = 0;
    setScore(0);
    setBestMs(null);
    setIsRecord(false);
    startRound(0);
  };

  const tap = () => {
    if (phase === "wait") endRound(round, null, true);
    else if (phase === "go") endRound(round, nowMs() - goAt.current, false);
  };

  if (phase === "start") return <StartCard game="reflex" best={best} onStart={start} blocked={false} />;
  if (phase === "end") {
    return (
      <ResultCard
        game="reflex"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={bestMs !== null ? `Reaksi tercepat: ${bestMs} ms` : "Tidak ada reaksi tercatat"}
        onAgain={start}
      />
    );
  }

  const bg =
    phase === "wait" ? "bg-red-500" : phase === "go" ? "bg-emerald-500" : early ? "bg-amber-500" : lastMs === null ? "bg-slate-500" : "bg-indigo-600";

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Ronde {round + 1}/{REFLEX_ROUNDS}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>
      <button
        type="button"
        onPointerDown={tap}
        className={`w-full h-64 rounded-2xl text-white flex flex-col items-center justify-center transition-colors duration-75 active:scale-[0.99] ${bg}`}
      >
        {phase === "wait" && (
          <>
            <span className="text-5xl">✋</span>
            <span className="mt-2 text-2xl font-black">Tunggu hijau…</span>
          </>
        )}
        {phase === "go" && <span className="text-6xl font-black animate-lb-pop">TAP!</span>}
        {phase === "result" && (
          <>
            <span className="text-5xl font-black">{early ? "Kepagian! 🙈" : lastMs === null ? "Telat 🐌" : `${lastMs} ms`}</span>
            <span className="mt-2 text-sm font-semibold opacity-90">
              {early || lastMs === null ? "0 poin" : `+${Math.max(0, 1000 - lastMs)} poin`}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
