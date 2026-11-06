"use client";

// =====================================================
// BinerGame — Kode Biner (solo). Papan ada di RoundCores.
// =====================================================

import { useState } from "react";
import { buildBinerRounds, type BinerRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { BinerCore } from "./ChallengeCores";

type Phase = "start" | "play" | "result";

export function BinerGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "biner");
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<BinerRound[]>([]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setRounds(buildBinerRounds());
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="biner" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="biner" score={score} best={best} isRecord={isRecord} stats="8 ronde selesai" onAgain={start} />
    );
  }
  return (
    <BinerCore
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
