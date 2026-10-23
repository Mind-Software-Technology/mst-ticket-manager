"use client";

// =====================================================
// RunGame — Lari Cepat (solo)
//
// 20 detik: tap KIRI/KANAN bergantian (F/J atau ←/→). Tiap langkah
// benar +10 (+bonus kombo). Sisi sama dua kali = tersandung -5.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
type Side = "L" | "R";
const SECONDS = 20;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function RunGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "lari");

  const [phase, setPhase] = useState<Phase>("start");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [steps, setSteps] = useState(0);
  const [stumbles, setStumbles] = useState(0);
  const [stumble, setStumble] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const endRef = useRef(0);
  const lastSide = useRef<Side | null>(null);
  const tapRef = useRef<(side: Side) => void>(() => {});

  const start = () => {
    setScore(0);
    setCombo(0);
    setSteps(0);
    setStumbles(0);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    lastSide.current = null;
    endRef.current = nowMs() + SECONDS * 1000;
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

  useEffect(() => {
    tapRef.current = (side) => {
      if (phase !== "play") return;
      if (side === lastSide.current) {
        setStumble(true);
        setTimeout(() => setStumble(false), 250);
        setCombo(0);
        setStumbles((n) => n + 1);
        setScore((s) => Math.max(0, s - 5));
        return;
      }
      lastSide.current = side;
      setSteps((n) => n + 1);
      setScore((s) => s + 10 + Math.min(Math.floor(combo / 10), 5) * 2);
      setCombo((c) => c + 1);
    };
  });

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === "f" || k === "arrowleft") tapRef.current("L");
      else if (k === "j" || k === "arrowright") tapRef.current("R");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "start") return <StartCard game="lari" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="lari"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${steps} langkah · ${stumbles} tersandung`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="grid grid-cols-2 gap-3">
        {(["L", "R"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onPointerDown={() => tapRef.current(side)}
            className={`h-40 rounded-2xl text-white text-3xl font-black shadow-lg active:scale-95 transition ${
              stumble ? "bg-red-500" : side === "L" ? "bg-gradient-to-br from-indigo-500 to-indigo-700" : "bg-gradient-to-br from-fuchsia-500 to-fuchsia-700"
            }`}
          >
            {side === "L" ? "👟 KIRI" : "KANAN 👟"}
            <span className="block text-xs font-semibold opacity-70">{side === "L" ? "tombol F / ←" : "tombol J / →"}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">{stumble ? "Tersandung! Gantian kiri-kanan 😵" : "Gantian kiri-kanan secepat mungkin!"}</p>
    </div>
  );
}
