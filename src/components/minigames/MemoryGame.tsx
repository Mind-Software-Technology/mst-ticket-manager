"use client";

// =====================================================
// MemoryGame — Memori Kilat (solo)
//
// 16 kartu (8 pasang), 60 detik. Cocok +100 (+bonus beruntun), salah -10,
// semua cocok = bonus sisa waktu.
// =====================================================

import { useRef, useState } from "react";
import { buildMemoryDeck } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const SECONDS = 60;
const MISMATCH_MS = 700;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function MemoryGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "memory");

  const [phase, setPhase] = useState<Phase>("start");
  const [deck, setDeck] = useState<string[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const start = () => {
    setDeck(buildMemoryDeck());
    setOpen([]);
    setMatched([]);
    setScore(0);
    setStreak(0);
    setMoves(0);
    setLocked(false);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    endRef.current = nowMs() + SECONDS * 1000;
    setPhase("play");
  };

  const finish = (finalScore: number) => {
    setIsRecord(submit(finalScore));
    setPhase("result");
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

  const flip = (i: number) => {
    if (phase !== "play" || locked || open.includes(i) || matched.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;

    setMoves((m) => m + 1);
    const [a, b] = next;
    if (deck[a] === deck[b]) {
      const matchedNow = [...matched, a, b];
      let total = score + 100 + Math.min(streak, 5) * 20;
      setMatched(matchedNow);
      setOpen([]);
      setStreak((s) => s + 1);
      if (matchedNow.length === deck.length) {
        total += Math.round(((endRef.current - nowMs()) / 1000) * 5);
        setScore(total);
        finish(total);
      } else setScore(total);
    } else {
      setLocked(true);
      setStreak(0);
      setScore(Math.max(0, score - 10));
      setTimeout(() => {
        setOpen([]);
        setLocked(false);
      }, MISMATCH_MS);
    }
  };

  if (phase === "start") return <StartCard game="memory" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="memory"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${matched.length / 2} pasang cocok · ${moves} percobaan`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={streak} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="grid grid-cols-4 gap-2">
        {deck.map((emoji, i) => {
          const faceUp = open.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              type="button"
              onPointerDown={() => flip(i)}
              className={`aspect-square rounded-xl text-3xl sm:text-4xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                matched.includes(i)
                  ? "bg-emerald-100 border-2 border-emerald-300"
                  : faceUp
                    ? "bg-white border-2 border-indigo-400 shadow"
                    : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white/70 shadow-inner"
              }`}
            >
              {faceUp ? emoji : "?"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
