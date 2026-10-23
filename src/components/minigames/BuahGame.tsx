"use client";

// =====================================================
// BuahGame — Tangkap Buah (solo)
//
// 40 detik: geser keranjang menangkap buah (+10) dan bintang emas (+30),
// hindari bom (-20). Barang makin cepat jatuh seiring waktu.
// =====================================================

import { useState } from "react";
import { BUAH_SECONDS, buildBuahSchedule, type BuahItem } from "@/lib/mp-content";
import { CatchField, type CatchKind } from "./CatchField";
import { ResultCard, StartCard, useBest } from "./GameParts";

type Phase = "start" | "play" | "result";

export function BuahGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "buah");

  const [phase, setPhase] = useState<Phase>("start");
  const [schedule, setSchedule] = useState<BuahItem[]>([]);
  const [score, setScore] = useState(0);
  const [fruits, setFruits] = useState(0);
  const [stars, setStars] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [left, setLeft] = useState(BUAH_SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const start = () => {
    setSchedule(buildBuahSchedule());
    setScore(0);
    setFruits(0);
    setStars(0);
    setBombs(0);
    setLeft(BUAH_SECONDS);
    setIsRecord(false);
    setPhase("play");
  };

  const onCatch = (pts: number, kind: CatchKind) => {
    setScore((s) => Math.max(0, s + pts));
    if (kind === 0) setFruits((n) => n + 1);
    else if (kind === 1) setStars((n) => n + 1);
    else setBombs((n) => n + 1);
  };

  if (phase === "start") return <StartCard game="buah" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="buah"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${fruits} buah · ${stars} bintang · ${bombs} kena bom`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={left < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(left)}s</span>
      </div>
      <CatchField
        schedule={schedule}
        seconds={BUAH_SECONDS}
        active
        onCatch={onCatch}
        onTick={setLeft}
        onDone={() => {
          setIsRecord(submit(score));
          setPhase("result");
        }}
      />
      <p className="mt-2 text-center text-xs text-slate-400">Geser mouse/jari, atau panah / A D · jauhi 💣</p>
    </div>
  );
}
