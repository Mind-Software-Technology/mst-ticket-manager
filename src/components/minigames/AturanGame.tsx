"use client";

// =====================================================
// AturanGame — Aturan Berubah (solo)
//
// 40 detik. Golongkan angka sesuai aturan yang tampil; aturan berganti
// tiap 6 angka. Benar +10 (bonus kombo), salah -5.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ATURAN_PER_RULE, ATURAN_RULES, ATURAN_SECONDS, buildAturanSequence, type AturanItem } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const nowMs = () => Date.now();

export function AturanGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "aturan");

  const [phase, setPhase] = useState<Phase>("start");
  const [items, setItems] = useState<AturanItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [timeLeft, setTimeLeft] = useState(ATURAN_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setItems(buildAturanSequence());
    setIdx(0);
    setScore(0);
    setCombo(0);
    setIsRecord(false);
    setTimeLeft(ATURAN_SECONDS);
    endRef.current = nowMs() + ATURAN_SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const answer = (left: boolean) => {
    if (phase !== "play") return;
    const item = items[idx];
    if (!item) return;
    const ok = ATURAN_RULES[item[1]].test(item[0]) === left;
    const c = ok ? combo + 1 : 0;
    setScore((s) => Math.max(0, s + (ok ? 10 + (c >= 5 ? 5 : 0) : -5)));
    setCombo(c);
    setFlash(ok ? "ok" : "bad");
    setTimeout(() => setFlash(null), 150);
    setIdx(idx + 1);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") answer(true);
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "start") return <StartCard game="aturan" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="aturan" score={score} best={best} isRecord={isRecord} stats={`${idx} angka dijawab`} onAgain={start} />
    );
  }

  const item = items[idx] ?? items[items.length - 1] ?? [0, 0];
  const rule = ATURAN_RULES[item[1]];

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <Hud score={score} combo={combo} fraction={timeLeft / ATURAN_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white">
        {rule.title} <span className="font-semibold opacity-70">({(idx % ATURAN_PER_RULE) + 1}/{ATURAN_PER_RULE})</span>
      </div>
      <div
        className={`mt-3 rounded-2xl border-2 py-8 text-7xl font-black transition-colors ${
          flash === "ok"
            ? "border-emerald-400 bg-emerald-50 text-emerald-600"
            : flash === "bad"
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {item[0]}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onPointerDown={() => answer(true)} className="py-4 rounded-xl bg-sky-500 text-white font-black active:scale-95">
          {rule.left}
        </button>
        <button type="button" onPointerDown={() => answer(false)} className="py-4 rounded-xl bg-fuchsia-500 text-white font-black active:scale-95">
          {rule.right}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Keyboard: F / ← kiri, J / → kanan</p>
    </div>
  );
}
