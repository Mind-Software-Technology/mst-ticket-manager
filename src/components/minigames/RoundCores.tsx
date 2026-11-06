"use client";

// =====================================================
// RoundCores — papan permainan berbasis ronde yang dipakai bersama oleh
// versi solo dan multiplayer (Kurang Sampai Nol & Kilatan Titik).
// Pembungkus solo/bareng yang mengurus mulai, hasil, dan sinkronisasi skor.
// =====================================================

import { useRef, useState } from "react";
import type { KilatanRound, NolRound } from "@/lib/mp-content";
import { useInterval } from "./GameParts";

interface CoreProps<R> {
  rounds: R[];
  /** Dipanggil tiap skor berubah. n = jumlah ronde yang sudah selesai. */
  onScore: (score: number, n: number) => void;
  /** Dipanggil sekali saat semua ronde selesai. */
  onDone: (score: number) => void;
}

// ─── Kurang Sampai Nol ───────────────────────────────

export function NolCore({ rounds, onScore, onDone }: CoreProps<NolRound>) {
  const [round, setRound] = useState(0);
  const [value, setValue] = useState(rounds[0]?.[0] ?? 0);
  const [taps, setTaps] = useState(0);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);

  const cur = rounds[round];
  if (!cur) return null;
  const [start, ops, opt] = cur;

  const press = (o: number) => {
    const nv = value - o;
    const t = taps + 1;
    if (nv < 0) {
      setValue(start);
      setTaps(t);
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }
    if (nv > 0) {
      setValue(nv);
      setTaps(t);
      return;
    }
    const total = score + 50 + Math.max(0, 30 - 6 * (t - opt));
    setScore(total);
    onScore(total, round + 1);
    if (round + 1 >= rounds.length) {
      onDone(total);
      return;
    }
    setRound(round + 1);
    setValue(rounds[round + 1][0]);
    setTaps(0);
  };

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
        <span>
          Ronde {round + 1}/{rounds.length}
        </span>
        <span className="text-indigo-600">Skor {score}</span>
      </div>
      <p className="text-sm font-bold text-slate-500">Kurangi sampai tepat 0 (minimum {opt} langkah)</p>
      <div
        className={`mt-2 rounded-2xl border-2 bg-white py-6 text-7xl font-black transition-colors ${
          shake ? "border-red-400 text-red-500" : "border-slate-200 text-slate-900"
        }`}
      >
        {value}
      </div>
      <p className="mt-1 text-xs text-slate-400">Langkah: {taps} · kelewat 0 = kembali ke {start}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ops.map((o) => (
          <button
            key={o}
            type="button"
            onPointerDown={() => press(o)}
            className="py-4 rounded-xl bg-indigo-500 text-white text-xl font-black active:scale-90"
          >
            −{o}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setValue(start);
          setTaps((t) => t + 1);
        }}
        className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-600"
      >
        ↺ Ulangi ronde (hitung 1 langkah)
      </button>
    </div>
  );
}

// ─── Kilatan Titik ───────────────────────────────────

type KStage = "show" | "answer" | "feedback";
const nowMs = () => Date.now();

export function KilatanCore({ rounds, onScore, onDone }: CoreProps<KilatanRound>) {
  const [round, setRound] = useState(0);
  const [stage, setStage] = useState<KStage>("show");
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [ticks, setTicks] = useState(0);
  const shownAt = useRef(0);

  const cur = rounds[round];
  const showTicks = Math.max(3, 8 - Math.floor(round / 2)); // x 100 ms

  useInterval(
    () => {
      if (stage === "show") {
        if (ticks + 1 >= showTicks) {
          shownAt.current = nowMs();
          setStage("answer");
        } else setTicks((t) => t + 1);
        return;
      }
      if (stage === "feedback") {
        if (round + 1 >= rounds.length) {
          onDone(score);
          return;
        }
        setRound(round + 1);
        setTicks(0);
        setPicked(null);
        setStage("show");
      }
    },
    stage === "show" ? 100 : stage === "feedback" ? 900 : null,
  );

  if (!cur) return null;
  const [count, options, answer, coords] = cur;

  const pick = (i: number) => {
    if (stage !== "answer") return;
    const ok = i === answer;
    const speed = Math.max(0, Math.round(10 - (nowMs() - shownAt.current) / 400));
    const total = Math.max(0, score + (ok ? 10 + speed : -5));
    setScore(total);
    setPicked(i);
    setStage("feedback");
    onScore(total, round + 1);
  };

  const dots = Array.from({ length: count }, (_, k) => [coords[k * 2], coords[k * 2 + 1]] as const);

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
        <span>
          Ronde {round + 1}/{rounds.length}
        </span>
        <span className="text-indigo-600">Skor {score}</span>
      </div>
      <div className="relative aspect-square rounded-2xl bg-slate-800 overflow-hidden">
        {(stage === "show" || stage === "feedback") &&
          dots.map(([x, y], i) => (
            <span
              key={i}
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          ))}
        {stage === "answer" && <span className="absolute inset-0 grid place-items-center text-5xl">❓</span>}
      </div>
      <p className="mt-2 text-sm font-bold text-slate-600">
        {stage === "show" ? "Hitung titiknya…" : stage === "answer" ? "Ada berapa titik tadi?" : picked === answer ? "Benar! 🎉" : `Salah 😅 (${count})`}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {options.map((o, i) => (
          <button
            key={i}
            type="button"
            disabled={stage !== "answer"}
            onPointerDown={() => pick(i)}
            className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:scale-90 disabled:opacity-50"
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
