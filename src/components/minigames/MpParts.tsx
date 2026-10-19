"use client";

// =====================================================
// MpParts — potongan UI bersama untuk minigame multiplayer
// =====================================================

import { useEffect, useState } from "react";
import { avatarFor, type MpMessage, type MpPlayer } from "@/lib/multiplayer";

const FINAL_WAIT_MS = 6000;

/**
 * Sinkronisasi skor untuk game "tiap pemain main sendiri": dengar siaran
 * `prog` pemain lain, gabungkan dengan skor sendiri, dan tentukan kapan
 * hasil akhir ditampilkan (semua selesai, atau batas tunggu).
 */
export function useRaceSync(
  subscribe: (fn: (msg: MpMessage) => void) => () => void,
  meId: string,
  joined: MpPlayer[],
  myScore: number,
  myDone: boolean,
) {
  const [progress, setProgress] = useState<Record<string, { score: number; done: boolean }>>({});
  const [finalized, setFinalized] = useState(false);

  useEffect(
    () =>
      subscribe((m) => {
        if (m.t === "prog") setProgress((prev) => ({ ...prev, [m.id]: { score: m.score, done: !!m.done } }));
      }),
    [subscribe],
  );

  const scores: Record<string, number> = {};
  for (const p of joined) scores[p.id] = p.id === meId ? myScore : (progress[p.id]?.score ?? 0);

  const allDone = joined.every((p) => (p.id === meId ? myDone : progress[p.id]?.done));
  useEffect(() => {
    if (!myDone) return;
    const id = setTimeout(() => setFinalized(true), allDone ? 800 : FINAL_WAIT_MS);
    return () => clearTimeout(id);
  }, [myDone, allDone]);

  return { scores, finalized };
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function Scoreboard({
  players,
  scores,
  meId,
  gain,
  suffix,
}: {
  players: MpPlayer[];
  scores: Record<string, number>;
  meId: string;
  /** Tambahan poin ronde terakhir, ditampilkan sebagai +N. */
  gain?: Record<string, number>;
  suffix?: (id: string) => string | null;
}) {
  const ranked = [...players].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || a.name.localeCompare(b.name),
  );
  const top = Math.max(1, ...ranked.map((p) => scores[p.id] ?? 0));
  return (
    <ul className="space-y-1.5">
      {ranked.map((p, i) => {
        const score = scores[p.id] ?? 0;
        const mine = p.id === meId;
        const extra = gain?.[p.id];
        return (
          <li
            key={p.id}
            className={`relative overflow-hidden rounded-xl border px-3 py-2 ${
              mine ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-100 to-fuchsia-100 transition-[width] duration-500"
              style={{ width: `${(score / top) * 100}%`, opacity: 0.7 }}
            />
            <div className="relative flex items-center gap-2 text-sm">
              <span className="w-6 text-center font-black text-slate-500">{MEDALS[i] ?? i + 1}</span>
              <span className="text-lg">{avatarFor(p.id)}</span>
              <span className="flex-1 truncate font-bold text-slate-800">
                {p.name}
                {mine && <span className="ml-1 text-[10px] font-semibold text-indigo-500">(kamu)</span>}
              </span>
              {suffix?.(p.id) && <span className="text-[11px] font-semibold text-slate-500">{suffix(p.id)}</span>}
              {extra !== undefined && (
                <span className={`text-xs font-black ${extra > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                  {extra > 0 ? `+${extra}` : "0"}
                </span>
              )}
              <span className="w-14 text-right text-base font-black text-slate-900">{score}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FinalPodium({
  players,
  scores,
  meId,
  notice,
  onBack,
  backLabel,
  onLeave,
}: {
  players: MpPlayer[];
  scores: Record<string, number>;
  meId: string;
  notice?: string;
  onBack?: () => void;
  backLabel: string;
  onLeave: () => void;
}) {
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const winner = ranked[0];
  const iWon = winner?.id === meId && (scores[meId] ?? 0) > 0;
  return (
    <div className="max-w-md mx-auto text-center py-4">
      <div className="text-6xl">{iWon ? "👑" : "🏁"}</div>
      <h3 className="mt-2 text-2xl font-black text-slate-900">
        {winner && (scores[winner.id] ?? 0) > 0 ? `${winner.name} juaranya!` : "Selesai!"}
      </h3>
      {iWon && <p className="text-sm font-semibold text-emerald-600">Kamu menang. Traktir tim dong 🍕</p>}
      {notice && <p className="mt-1 text-xs text-amber-600">{notice}</p>}
      <div className="mt-4 text-left">
        <Scoreboard players={players} scores={scores} meId={meId} />
      </div>
      <div className="mt-5 flex items-center justify-center gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl text-white font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-lg hover:opacity-90 active:scale-95 transition"
          >
            {backLabel}
          </button>
        ) : (
          <span className="text-xs text-slate-400">Menunggu host membuka lobi lagi…</span>
        )}
        <button
          type="button"
          onClick={onLeave}
          className="px-5 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
