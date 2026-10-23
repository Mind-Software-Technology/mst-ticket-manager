"use client";

// =====================================================
// BesarGame — Lebih Besar (solo)
//
// 30 detik: dua angka/hitungan, tap sisi yang nilainya lebih besar
// (keyboard: F kiri, J kanan, atau ← →). Benar +10 (+kombo), salah -5.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { BESAR_SECONDS, buildBesarSequence, type BesarItem } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
export type Side = "L" | "R";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

/** Dua kartu pilihan; dipakai bersama oleh mode solo & bareng. */
export function BesarCards({
  item,
  onPick,
  wrong,
}: {
  item: BesarItem;
  onPick: (side: Side) => void;
  wrong: boolean;
}) {
  const sides = [
    { side: "L" as const, text: item[0], hint: "F / ←" },
    { side: "R" as const, text: item[2], hint: "J / →" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {sides.map((s) => (
        <button
          key={s.side}
          type="button"
          onPointerDown={() => onPick(s.side)}
          className={`h-36 rounded-2xl border-2 bg-white text-center shadow-sm active:scale-95 transition ${
            wrong ? "border-red-400" : "border-slate-200 hover:border-indigo-300"
          }`}
        >
          <span className="block text-3xl font-black text-slate-900">{s.text}</span>
          <span className="mt-2 block text-[11px] font-semibold text-slate-400">{s.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** Pasang tombol keyboard F/J dan ←/→ selagi `active`. */
export function useSideKeys(active: boolean, onPick: (side: Side) => void) {
  const ref = useRef(onPick);
  useEffect(() => {
    ref.current = onPick;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "arrowleft") ref.current("L");
      else if (k === "j" || k === "arrowright") ref.current("R");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

export function BesarGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "besar");

  const [phase, setPhase] = useState<Phase>("start");
  const [seq, setSeq] = useState<BesarItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BESAR_SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const endRef = useRef(0);

  const start = () => {
    setSeq(buildBesarSequence());
    setIndex(0);
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setWrong(false);
    setIsRecord(false);
    setTimeLeft(BESAR_SECONDS);
    endRef.current = nowMs() + BESAR_SECONDS * 1000;
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

  const pick = (side: Side) => {
    const item = seq[index];
    if (phase !== "play" || !item) return;
    const correct: Side = item[1] > item[3] ? "L" : "R";
    if (side === correct) {
      setScore((s) => s + 10 + Math.min(Math.floor(combo / 5), 5) * 2);
      setCombo((c) => c + 1);
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

  useSideKeys(phase === "play", pick);

  if (phase === "start") return <StartCard game="besar" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="besar"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} benar · ${misses} salah`}
        onAgain={start}
      />
    );
  }

  const item = seq[index];
  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / BESAR_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-xs font-bold text-slate-400">Mana yang nilainya LEBIH BESAR?</p>
      {item && <BesarCards item={item} onPick={pick} wrong={wrong} />}
    </div>
  );
}
