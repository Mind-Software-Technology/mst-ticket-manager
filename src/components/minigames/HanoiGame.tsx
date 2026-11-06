"use client";

// =====================================================
// HanoiGame — Menara Hanoi (solo). Papan ada di RoundCores.
// =====================================================

import { useState } from "react";
import { buildHanoiRounds, type HanoiRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { HanoiCore } from "./ChallengeCores";

type Phase = "start" | "play" | "result";

export function HanoiGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "hanoi");
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<HanoiRound[]>([]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setRounds(buildHanoiRounds());
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="hanoi" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="hanoi" score={score} best={best} isRecord={isRecord} stats="3 menara terpindah" onAgain={start} />
    );
  }
  return (
    <HanoiCore
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
