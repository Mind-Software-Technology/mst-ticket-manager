"use client";

// =====================================================
// RitmeGame — Ritme Tap (solo)
//
// 48 detik, nada jatuh di 4 jalur. Tap jalur (atau tombol D F J K) saat
// nada tepat di garis. Perfect +20, bagus +10, kombo 10+ bonus +5.
// Tap meleset memutus kombo.
// =====================================================

import { useState } from "react";
import { buildRitmeChart, type RitmeNote } from "@/lib/ritme";
import { ResultCard, StartCard, useBest } from "./GameParts";
import { RitmeArena } from "./RitmeArena";
import { useRitme } from "./useRitme";

type Phase = "start" | "play" | "result";

export function RitmeGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "ritme");
  const [phase, setPhase] = useState<Phase>("start");
  const [chart, setChart] = useState<RitmeNote[]>([]);
  const [round, setRound] = useState(0);

  const start = () => {
    setChart(buildRitmeChart());
    setRound((r) => r + 1);
    setPhase("play");
  };

  if (phase === "start") return <StartCard game="ritme" best={best} onStart={start} blocked={false} />;

  return (
    <Run
      key={round}
      chart={chart}
      active={phase === "play"}
      best={best}
      submit={submit}
      onAgain={start}
      onDone={() => setPhase("result")}
      showResult={phase === "result"}
    />
  );
}

function Run({
  chart,
  active,
  best,
  submit,
  onAgain,
  onDone,
  showResult,
}: {
  chart: RitmeNote[];
  active: boolean;
  best: number;
  submit: (score: number) => boolean;
  onAgain: () => void;
  onDone: () => void;
  showResult: boolean;
}) {
  const [isRecord, setIsRecord] = useState(false);
  const r = useRitme(chart, active, {
    onEnd: (s) => {
      setIsRecord(submit(s));
      onDone();
    },
  });

  if (showResult) {
    return (
      <ResultCard
        game="ritme"
        score={r.score}
        best={best}
        isRecord={isRecord}
        stats={`kombo terbaik x${r.best}`}
        onAgain={onAgain}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{r.score}</span>
        </span>
        <span className="text-orange-600">🔥 {r.combo}</span>
      </div>
      <RitmeArena notes={r.notes} flash={r.flash} combo={r.combo} active={active} onTap={r.tap} />
    </div>
  );
}
