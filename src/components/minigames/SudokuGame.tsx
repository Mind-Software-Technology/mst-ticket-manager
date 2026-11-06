"use client";

// =====================================================
// SudokuGame — Sudoku Mini (solo). Papan ada di RoundCores.
// =====================================================

import { useState } from "react";
import { buildSudokuRounds, type SudokuRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { SudokuCore } from "./ChallengeCores";

type Phase = "start" | "play" | "result";

export function SudokuGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "sudoku");
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<SudokuRound[]>([]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setRounds(buildSudokuRounds());
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="sudoku" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="sudoku" score={score} best={best} isRecord={isRecord} stats="3 papan selesai" onAgain={start} />
    );
  }
  return (
    <SudokuCore
      rounds={rounds}
      onScore={() => {}}
      onDone={(total) => {
        setScore(total);
        setIsRecord(submit(total));
        setPhase("result");
      }}
    />
  );
}
