"use client";

// =====================================================
// StopGame — Berhenti Tepat (solo)
//
// 10 ronde. Penanda bergerak bolak-balik; tap/Spasi untuk menghentikan.
// Poin 0..100 tergantung jarak ke pusat zona hijau. Tiap ronde makin
// cepat dan zona makin sempit.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ResultCard, StartCard, useBest } from "./GameParts";

type Phase = "start" | "play" | "result";

const ROUNDS = 10;
const zoneWidth = (r: number) => Math.max(0.08, 0.3 - r * 0.025);
const periodMs = (r: number) => Math.max(700, 1800 - r * 120);

/** Gelombang segitiga 0..1..0 */
const tri = (t: number) => 1 - Math.abs(((t % 1) + 1) % 1 * 2 - 1);

export function StopGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "stop");
  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState(0);
  const [center, setCenter] = useState(0.5);
  const [stopped, setStopped] = useState<{ pos: number; pts: number } | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const t0 = useRef(0);
  const nextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newRound = (r: number) => {
    const w = zoneWidth(r);
    setCenter(w / 2 + 0.05 + Math.random() * (0.9 - w));
    setStopped(null);
    setRound(r);
    t0.current = performance.now();
  };

  const start = () => {
    setScore(0);
    setIsRecord(false);
    newRound(0);
    setPhase("play");
  };

  // animasi penanda
  useEffect(() => {
    if (phase !== "play" || stopped) return;
    let raf = 0;
    const loop = () => {
      setPos(tri((performance.now() - t0.current) / periodMs(round)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, stopped, round]);

  useEffect(() => () => {
    if (nextTimer.current) clearTimeout(nextTimer.current);
  }, []);

  const stop = () => {
    if (phase !== "play" || stopped) return;
    const p = tri((performance.now() - t0.current) / periodMs(round));
    const half = zoneWidth(round) / 2;
    const dist = Math.abs(p - center);
    // di dalam zona: 60..100; di luar: turun cepat sampai 0
    const pts =
      dist <= half
        ? Math.round(100 - (dist / half) * 40)
        : Math.max(0, Math.round(60 - ((dist - half) / 0.15) * 60));
    const total = score + pts;
    setPos(p);
    setStopped({ pos: p, pts });
    setScore(total);
    nextTimer.current = setTimeout(() => {
      if (round + 1 >= ROUNDS) {
        setIsRecord(submit(total));
        setPhase("result");
      } else newRound(round + 1);
    }, 900);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "start") return <StartCard game="stop" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard game="stop" score={score} best={best} isRecord={isRecord} stats={`${ROUNDS} ronde selesai`} onAgain={start} />
    );
  }

  const w = zoneWidth(round);
  return (
    <div className="max-w-md mx-auto select-none text-center">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Ronde {round + 1}/{ROUNDS}</span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>
      <div className="relative mt-6 h-12 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="absolute inset-y-0 bg-emerald-400/70"
          style={{ left: `${(center - w / 2) * 100}%`, width: `${w * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-1.5 -ml-[3px] rounded bg-indigo-600"
          style={{ left: `${(stopped ? stopped.pos : pos) * 100}%` }}
        />
      </div>
      <p className="mt-3 h-8 text-2xl font-black text-slate-800">
        {stopped ? (stopped.pts >= 90 ? `🎯 +${stopped.pts}` : `+${stopped.pts}`) : ""}
      </p>
      <button
        type="button"
        onPointerDown={stop}
        className="mt-2 w-full py-5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white text-xl font-black shadow-lg active:scale-95 transition"
      >
        STOP!
      </button>
      <p className="mt-1 text-[11px] text-slate-400">Keyboard: Spasi</p>
    </div>
  );
}
