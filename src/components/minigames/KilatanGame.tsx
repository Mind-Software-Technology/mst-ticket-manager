"use client";

// =====================================================
// KilatanGame — Kilatan Titik (solo). Papan ada di RoundCores.
// =====================================================

import { useState } from "react";
import { buildKilatanRounds, type KilatanRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { KilatanCore } from "./RoundCores";

type Phase = "start" | "play" | "result";

export function KilatanGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "kilatan");
  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<KilatanRound[]>([]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setRounds(buildKilatanRounds());
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="kilatan" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="kilatan" score={score} best={best} isRecord={isRecord} stats="12 ronde selesai" onAgain={start} />
    );
  }
  return (
    <KilatanCore
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
