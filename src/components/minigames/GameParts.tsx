"use client";

// =====================================================
// GameParts — potongan UI & hook yang dipakai bersama semua minigame
// =====================================================

import { useEffect, useRef, useState } from "react";
import { GAMES, loadBest, resultMessage, saveBest, type GameKey } from "@/lib/minigame";

/** setInterval yang selalu memanggil callback terbaru; ms = null → berhenti. */
export function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  });
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/** setTimeout yang otomatis dibersihkan saat komponen dilepas. */
export function useDelay() {
  const ids = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    const set = ids.current;
    return () => set.forEach(clearTimeout);
  }, []);
  return (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
  };
}

export function useBest(userId: string | undefined, game: GameKey) {
  const [best, setBest] = useState(() => loadBest(userId, game));
  /** Simpan skor akhir; return true kalau memecahkan rekor. */
  const submit = (score: number): boolean => {
    const record = saveBest(userId, game, score);
    if (record) setBest(score);
    return record;
  };
  return { best, submit };
}

export function StartCard({
  game,
  best,
  onStart,
  blocked,
}: {
  game: GameKey;
  best: number;
  onStart: () => void;
  blocked: boolean;
}) {
  const cfg = GAMES[game];
  return (
    <div className="max-w-md mx-auto text-center py-6">
      <div className="text-6xl animate-lb-float inline-block">{cfg.emoji}</div>
      <h3 className="mt-3 text-2xl font-black text-slate-900">{cfg.label}</h3>
      <p className="mt-1 text-sm text-slate-500">{cfg.tagline}</p>
      <ul className="mt-4 text-left text-sm text-slate-600 space-y-1.5 bg-white border border-slate-200 rounded-xl p-4">
        {cfg.rules.map((r) => (
          <li key={r} className="flex gap-2">
            <span>▸</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {best > 0 && (
        <p className="mt-3 text-sm font-semibold text-amber-600">🏅 Rekor kamu: {best}</p>
      )}
      <button
        type="button"
        onClick={onStart}
        disabled={blocked}
        className="mt-5 px-8 py-3 rounded-xl text-white font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-lg hover:opacity-90 active:scale-95 transition disabled:opacity-40"
      >
        Mulai Main! 🚀
      </button>
      {blocked && <p className="mt-3 text-xs text-slate-500">{cfg.needs}</p>}
    </div>
  );
}

export function ResultCard({
  game,
  score,
  best,
  isRecord,
  stats,
  onAgain,
}: {
  game: GameKey;
  score: number;
  best: number;
  isRecord: boolean;
  stats: string;
  onAgain: () => void;
}) {
  return (
    <div className="max-w-md mx-auto text-center py-6">
      <div className="text-6xl">{isRecord ? "🎉" : "🏁"}</div>
      <h3 className="mt-2 text-sm font-bold uppercase tracking-wider text-slate-400">Skor Akhir</h3>
      <p className="text-6xl font-black bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 bg-clip-text text-transparent">
        {score}
      </p>
      {isRecord ? (
        <p className="mt-1 text-sm font-bold text-emerald-600">✨ Rekor baru!</p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">Rekor kamu: {best}</p>
      )}
      <p className="mt-3 text-sm text-slate-600">{resultMessage(game, score)}</p>
      <p className="mt-1 text-xs text-slate-400">{stats}</p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-5 px-8 py-3 rounded-xl text-white font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-lg hover:opacity-90 active:scale-95 transition"
      >
        Main Lagi 🔁
      </button>
    </div>
  );
}

export function Hud({
  score,
  combo,
  fraction,
  label,
}: {
  score: number;
  combo: number;
  /** Sisa waktu 0..1. */
  fraction: number;
  label: string;
}) {
  const low = fraction < 0.25;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={`transition-all ${combo >= 2 ? "text-orange-500 scale-110" : "text-slate-300"}`}>
          🔥 x{combo}
        </span>
        <span className={low ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {label}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            low ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-indigo-500"
          }`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
    </div>
  );
}
