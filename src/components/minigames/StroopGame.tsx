"use client";

// =====================================================
// StroopGame — Warna Mengecoh (solo)
//
// 30 detik: tap warna TINTA kata yang tampil, bukan arti tulisannya.
// Benar +10 (+bonus kombo), salah -5 dan kombo hangus.
// =====================================================

import { useRef, useState } from "react";
import { STROOP_COLORS, STROOP_SECONDS, buildStroopSequence, type StroopItem } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

export const STROOP_TEXT = ["text-red-500", "text-blue-500", "text-emerald-500", "text-yellow-400"];
export const STROOP_BG = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-yellow-400"];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function StroopGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "warna");

  const [phase, setPhase] = useState<Phase>("start");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(STROOP_SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const [seq, setSeq] = useState<StroopItem[]>([]);
  const endRef = useRef(0);

  const start = () => {
    setSeq(buildStroopSequence());
    setScore(0);
    setCombo(0);
    setIndex(0);
    setHits(0);
    setMisses(0);
    setWrong(false);
    setIsRecord(false);
    setTimeLeft(STROOP_SECONDS);
    endRef.current = nowMs() + STROOP_SECONDS * 1000;
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

  const pick = (c: number) => {
    const item = seq[index];
    if (!item) return;
    if (c === item[1]) {
      setScore((s) => s + 10 + Math.min(Math.floor(combo / 5), 5) * 2);
      setCombo((n) => n + 1);
      setHits((n) => n + 1);
    } else {
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setMisses((n) => n + 1);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setIndex((i) => i + 1);
  };

  if (phase === "start") return <StartCard game="warna" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="warna"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} benar · ${misses} salah`}
        onAgain={start}
      />
    );
  }

  const item = seq[index] ?? [0, 0];
  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / STROOP_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className={`rounded-2xl bg-white border-2 py-10 text-center transition-colors ${wrong ? "border-red-400" : "border-slate-200"}`}>
        <p className="text-xs font-bold text-slate-400">Warna TINTA-nya apa?</p>
        <p className={`mt-2 text-6xl font-black ${STROOP_TEXT[item[1]]}`}>{STROOP_COLORS[item[0]]}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {STROOP_COLORS.map((name, c) => (
          <button
            key={name}
            type="button"
            onPointerDown={() => pick(c)}
            className={`h-20 rounded-2xl text-white text-lg font-black shadow-md active:scale-95 transition ${STROOP_BG[c]}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
