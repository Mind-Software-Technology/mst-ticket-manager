"use client";

// =====================================================
// NolGame — Kurang Sampai Nol (solo). Papan ada di RoundCores.
// =====================================================

import { useState } from "react";
import { buildNolRounds, type NolRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { NolCore } from "./RoundCores";

type Phase = "start" | "play" | "result";

export function NolGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "nol");
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<NolRound[]>([]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setRounds(buildNolRounds());
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="nol" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="nol" score={score} best={best} isRecord={isRecord} stats="8 ronde selesai" onAgain={start} />
    );
  }
  return (
    <NolCore
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
