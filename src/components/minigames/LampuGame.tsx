"use client";

// =====================================================
// LampuGame — Lampu Padam (solo)
//
// 3 papan 4x4, 120 detik total. Tap lampu = balik lampu itu + 4 tetangganya.
// Papan padam = 150 + bonus sedikit langkah (maks +60); semua selesai
// menambah bonus sisa waktu.
// =====================================================

import { useRef, useState } from "react";
import {
  LAMPU_BOARDS as BOARDS,
  LAMPU_SECONDS as SECONDS,
  buildLampuBoard as buildBoard,
  lampuBoardScore,
  lampuPress as press,
} from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function LampuGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "lampu");

  const [phase, setPhase] = useState<Phase>("start");
  const [board, setBoard] = useState<boolean[]>([]);
  const [boardNo, setBoardNo] = useState(0);
  const [moves, setMoves] = useState(0);
  const [totalMoves, setTotalMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setBoard(buildBoard());
    setBoardNo(0);
    setMoves(0);
    setTotalMoves(0);
    setScore(0);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    endRef.current = nowMs() + SECONDS * 1000;
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
    const next = press(board, i);
    const m = moves + 1;
    setTotalMoves((t) => t + 1);
    if (next.some(Boolean)) {
      setBoard(next);
      setMoves(m);
      return;
    }
    // Papan padam.
    let gained = lampuBoardScore(m);
    if (boardNo + 1 >= BOARDS) {
      gained += Math.floor((endRef.current - nowMs()) / 1000) * 2;
      finish(score + gained);
    } else {
      setScore((s) => s + gained);
      setBoard(buildBoard());
      setBoardNo((n) => n + 1);
      setMoves(0);
    }
  };

  if (phase === "start") return <StartCard game="lampu" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="lampu"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${totalMoves} langkah total`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <Hud score={score} combo={0} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
        <span>
          Papan {boardNo + 1}/{BOARDS}
        </span>
        <span>{moves} langkah</span>
      </div>
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-800 p-3 shadow-inner">
        {board.map((on, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Lampu ${i + 1} ${on ? "menyala" : "padam"}`}
            onPointerDown={() => tap(i)}
            className={`aspect-square rounded-xl text-2xl transition-all duration-150 active:scale-90 ${
              on
                ? "bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_18px_rgba(251,191,36,0.8)]"
                : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            {on ? "💡" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
