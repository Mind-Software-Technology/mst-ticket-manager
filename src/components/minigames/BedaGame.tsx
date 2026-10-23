"use client";

// =====================================================
// BedaGame — Cari Beda (solo)
//
// 30 detik: satu emoji di papan sedikit berbeda, tap secepat mungkin.
// Papan membesar (3x3 sampai 6x6). Benar +10 (+kombo), salah -5.
// =====================================================

import { useRef, useState } from "react";
import { BEDA_PAIRS, BEDA_SECONDS, bedaSize, buildBedaSequence, type BedaItem } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

/** Papan emoji untuk satu soal; dipakai bersama oleh mode solo & bareng. */
export function BedaBoard({
  index,
  item,
  onPick,
  wrong,
}: {
  index: number;
  item: BedaItem;
  onPick: (pos: number) => void;
  wrong: boolean;
}) {
  const n = bedaSize(index);
  const pair = BEDA_PAIRS[item[0]];
  const common = pair[item[1]];
  const odd = pair[1 - item[1]];
  return (
    <div
      className={`mx-auto grid gap-1.5 rounded-2xl border-2 bg-white p-2 transition-colors ${wrong ? "border-red-400" : "border-slate-200"}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, maxWidth: "22rem" }}
    >
      {Array.from({ length: n * n }, (_, pos) => (
        <button
          key={`${index}-${pos}`}
          type="button"
          onPointerDown={() => onPick(pos)}
          className="aspect-square rounded-lg bg-slate-50 text-2xl sm:text-3xl hover:bg-slate-100 active:scale-90 transition"
        >
          {pos === item[2] ? odd : common}
        </button>
      ))}
    </div>
  );
}

export function BedaGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "beda");

  const [phase, setPhase] = useState<Phase>("start");
  const [seq, setSeq] = useState<BedaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BEDA_SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const endRef = useRef(0);

  const start = () => {
    setSeq(buildBedaSequence());
    setIndex(0);
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setWrong(false);
    setIsRecord(false);
    setTimeLeft(BEDA_SECONDS);
    endRef.current = nowMs() + BEDA_SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setIsRecord(submit(score));
        setPhase("result");
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const pick = (pos: number) => {
    const item = seq[index];
    if (!item) return;
    if (pos === item[2]) {
      setScore((s) => s + 10 + Math.min(Math.floor(combo / 3), 5) * 2);
      setCombo((c) => c + 1);
      setHits((n) => n + 1);
      setIndex((i) => i + 1);
    } else {
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setMisses((n) => n + 1);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
  };

  if (phase === "start") return <StartCard game="beda" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="beda"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} ketemu · ${misses} salah tap`}
        onAgain={start}
      />
    );
  }

  const item = seq[index];
  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / BEDA_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-xs font-bold text-slate-400">Tap emoji yang beda sendiri</p>
      {item && <BedaBoard index={index} item={item} onPick={pick} wrong={wrong} />}
    </div>
  );
}
