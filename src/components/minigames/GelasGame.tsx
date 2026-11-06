"use client";

// =====================================================
// GelasGame — Tebak Gelas (solo)
//
// Bola disembunyikan di bawah salah satu dari 3 gelas, lalu gelas diacak.
// Tebak di gelas mana bola berada. Benar = 100 + 25 x ronde, 3 nyawa.
// Makin tinggi ronde, acakan makin banyak dan cepat.
// =====================================================

import { useRef, useState } from "react";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "show" | "shuffle" | "pick" | "reveal" | "result";

const LIVES = 3;

export function GelasGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "gelas");

  const [phase, setPhase] = useState<Phase>("start");
  // slot[c] = posisi (0..2) gelas bernomor c
  const [slot, setSlot] = useState<number[]>([0, 1, 2]);
  const [ball, setBall] = useState(0); // nomor gelas yang menyembunyikan bola
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const swapsLeft = useRef(0);
  const pause = useRef(0);

  const swapsFor = (r: number) => 3 + r * 2;
  const stepMs = (r: number) => Math.max(260, 520 - r * 30);

  const beginRound = (r: number) => {
    setSlot([0, 1, 2]);
    setBall(Math.floor(Math.random() * 3));
    setPicked(null);
    setRound(r);
    swapsLeft.current = swapsFor(r);
    pause.current = 0;
    setPhase("show");
  };

  const start = () => {
    setLives(LIVES);
    setScore(0);
    setCorrect(0);
    setIsRecord(false);
    beginRound(1);
  };

  const endGame = (finalScore: number) => {
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  // Fase "show" menahan 1 detik, lalu "shuffle" menukar sepasang gelas tiap langkah.
  useInterval(
    () => {
      if (phase === "show") {
        pause.current += 1;
        if (pause.current >= 4) setPhase("shuffle");
        return;
      }
      if (phase === "shuffle") {
        if (swapsLeft.current <= 0) {
          setPhase("pick");
          return;
        }
        swapsLeft.current -= 1;
        const a = Math.floor(Math.random() * 3);
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
        setSlot((s) => {
          const n = [...s];
          const ia = n.findIndex((p) => p === a);
          const ib = n.findIndex((p) => p === b);
          n[ia] = b;
          n[ib] = a;
          return n;
        });
        return;
      }
      if (phase === "reveal") {
        pause.current += 1;
        if (pause.current >= 4) {
          if (lives <= 0) endGame(score);
          else beginRound(round + 1);
        }
      }
    },
    phase === "show" ? 250 : phase === "shuffle" ? stepMs(round) : phase === "reveal" ? 250 : null,
  );

  const pick = (c: number) => {
    if (phase !== "pick") return;
    setPicked(c);
    pause.current = 0;
    if (c === ball) {
      setScore((s) => s + 100 + 25 * round);
      setCorrect((n) => n + 1);
    } else {
      setLives((l) => l - 1);
    }
    setPhase("reveal");
  };

  if (phase === "start") return <StartCard game="gelas" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="gelas"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${correct} tebakan benar · sampai ronde ${round}`}
        onAgain={start}
      />
    );
  }

  const lifted = phase === "show" || phase === "reveal";
  const message =
    phase === "show"
      ? "Perhatikan bolanya…"
      : phase === "shuffle"
        ? "Diacak!"
        : phase === "pick"
          ? "Di gelas mana bolanya?"
          : picked === ball
            ? "Benar! 🎉"
            : "Salah 😅";

  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className="text-slate-500">Ronde {round}</span>
        <span>{"❤️".repeat(Math.max(lives, 0)) || "💔"}</span>
      </div>
      <div className="relative h-40 rounded-2xl bg-amber-100 overflow-hidden">
        {[0, 1, 2].map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Gelas ${c + 1}`}
            disabled={phase !== "pick"}
            onPointerDown={() => pick(c)}
            className="absolute top-4 w-1/3 transition-[left] ease-in-out disabled:cursor-default"
            style={{ left: `${slot[c] * 33.333}%`, transitionDuration: `${Math.min(stepMs(round), 400)}ms` }}
          >
            <span
              className={`block text-6xl transition-transform duration-300 ${
                lifted && c === ball ? "-translate-y-6" : ""
              }`}
            >
              🥤
            </span>
            <span className={`block text-3xl transition-opacity ${lifted && c === ball ? "opacity-100" : "opacity-0"}`}>
              ⚽
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
    </div>
  );
}
