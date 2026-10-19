"use client";

// =====================================================
// CheckinLeaderboard — papan peringkat check-in yang kocak
//
// 3 papan (Raja Streak, Si Paling Rajin, Ayam Jago), podium juara
// 1-3 dengan gelar random-tapi-stabil, dan daftar sisanya lengkap
// dengan ledekan halus buat yang belum check-in hari ini.
// =====================================================

import { useMemo, useState } from "react";
import { Crown, Loader2, RefreshCw } from "lucide-react";
import { useCheckinLeaderboard } from "@/hooks/useCheckinLeaderboard";
import {
  BOARDS,
  STREAK_MILESTONE,
  avatarGradient,
  daysToMilestone,
  initials,
  nudgeFor,
  rankEntries,
  scoreLabel,
  titleFor,
  type BoardKey,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

// Urutan tampilan podium: juara 2 – juara 1 – juara 3
const PODIUM_ORDER = [1, 0, 2] as const;

const PODIUM_STYLE = [
  { height: "h-28", ring: "ring-amber-300", glow: "shadow-amber-300/60", base: "from-amber-300 to-yellow-500" },
  { height: "h-20", ring: "ring-slate-300", glow: "shadow-slate-300/60", base: "from-slate-300 to-slate-400" },
  { height: "h-14", ring: "ring-orange-300", glow: "shadow-orange-300/60", base: "from-orange-300 to-amber-600" },
] as const;

function Avatar({ entry, size }: { entry: LeaderboardEntry; size: "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br ${avatarGradient(entry.userId)} text-white font-black flex items-center justify-center select-none`}
    >
      {initials(entry.name)}
    </div>
  );
}

function PodiumSpot({
  entry,
  rank,
  board,
  meId,
}: {
  entry: LeaderboardEntry;
  rank: number;
  board: BoardKey;
  meId?: string;
}) {
  const style = PODIUM_STYLE[rank];
  const isMe = entry.userId === meId;
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        {rank === 0 && (
          <Crown className="w-7 h-7 text-amber-400 fill-amber-300 animate-lb-crown absolute -top-8" />
        )}
        <div
          className={`rounded-full ring-4 ${style.ring} shadow-xl ${style.glow} ${rank === 0 ? "animate-lb-float" : ""}`}
        >
          <Avatar entry={entry} size="lg" />
        </div>
        {!entry.checkedInToday && (
          <span className="absolute -right-1 -bottom-1 text-lg" title="Belum check-in hari ini">
            😴
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-bold text-slate-900 text-center truncate max-w-full px-1">
        {entry.name}
        {isMe && <span className="ml-1 text-[10px] font-semibold text-indigo-600">(kamu)</span>}
      </p>
      <p className="text-[11px] leading-tight text-slate-500 text-center italic px-1 min-h-[2.2em]">
        {titleFor(entry, board, rank)}
      </p>

      <div
        className={`mt-2 w-full ${style.height} rounded-t-xl bg-gradient-to-b ${style.base} flex flex-col items-center justify-center text-white shadow-inner`}
      >
        <span className="text-2xl">{MEDALS[rank]}</span>
        <span className="text-lg font-black leading-none drop-shadow">
          {scoreLabel(entry, board)}
          {BOARDS[board].unit && <span className="text-[10px] font-semibold ml-0.5">{BOARDS[board].unit}</span>}
        </span>
      </div>
    </div>
  );
}

function StreakProgress({ streak }: { streak: number }) {
  const left = daysToMilestone(streak);
  const pct = Math.min(100, Math.round((streak / STREAK_MILESTONE) * 100));
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">
        {left === null ? "🎉 Api biru 50 terbuka! Legenda." : `${left} hari lagi menuju api biru ${STREAK_MILESTONE} 🔥`}
      </p>
    </div>
  );
}

function Row({
  entry,
  rank,
  board,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  board: BoardKey;
  isMe: boolean;
}) {
  const nudge = nudgeFor(entry);
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isMe ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white hover:bg-slate-50"
      }`}
    >
      <span className="w-7 text-center text-sm font-black text-slate-400">#{rank + 1}</span>
      <Avatar entry={entry} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {entry.name}
          {isMe && <span className="ml-1.5 text-[10px] font-semibold text-indigo-600">(kamu)</span>}
          {entry.checkedInToday && (
            <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
              ✅ sudah nongol
            </span>
          )}
        </p>
        <p className="text-[11px] text-slate-500 italic truncate">{titleFor(entry, board, rank)}</p>
        {board === "streak" && <StreakProgress streak={entry.streak} />}
        {nudge && !isMe && <p className="text-[10px] text-amber-600 mt-0.5 truncate">{nudge}</p>}
        {nudge && isMe && <p className="text-[10px] text-rose-600 font-semibold mt-0.5">{nudge}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xl font-black leading-none bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 bg-clip-text text-transparent">
          {scoreLabel(entry, board)}
        </p>
        {BOARDS[board].unit && <p className="text-[10px] text-slate-400">{BOARDS[board].unit}</p>}
      </div>
    </li>
  );
}

export function CheckinLeaderboard({ meId }: { meId?: string }) {
  const { entries, loading, error, refresh } = useCheckinLeaderboard();
  const [board, setBoard] = useState<BoardKey>("streak");

  const ranked = useMemo(() => rankEntries(entries, board), [entries, board]);
  const top = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const meRank = meId ? ranked.findIndex((e) => e.userId === meId) : -1;
  const doneToday = entries.filter((e) => e.checkedInToday).length;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span className="animate-lb-float inline-block">🏆</span> Papan Peringkat Check-In
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {BOARDS[board].tagline}
            {entries.length > 0 && (
              <span className="ml-2 text-slate-400">
                · {doneToday}/{entries.length} sudah check-in hari ini
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          title="Segarkan"
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 flex gap-2 flex-wrap">
        {(Object.keys(BOARDS) as BoardKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBoard(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              board === key
                ? "bg-indigo-600 text-white shadow-md scale-105"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {BOARDS[key].emoji} {BOARDS[key].label}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-6 pb-5 pt-8">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading && entries.length === 0 ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Menghitung siapa yang paling rajin…
          </div>
        ) : ranked.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {board === "pagi"
              ? "Belum ada ayam jago. Butuh minimal 3 kali check-in dalam 30 hari terakhir. 🐣"
              : "Belum ada peserta. Jadilah yang pertama! 🚀"}
          </p>
        ) : (
          <>
            {/* Podium */}
            <div className="flex items-end gap-2 md:gap-4 max-w-xl mx-auto">
              {PODIUM_ORDER.map((idx) =>
                top[idx] ? (
                  <PodiumSpot key={top[idx].userId} entry={top[idx]} rank={idx} board={board} meId={meId} />
                ) : (
                  <div key={idx} className="flex-1" />
                ),
              )}
            </div>

            {/* Sisanya */}
            {rest.length > 0 && (
              <ul className="mt-5 space-y-1.5 max-w-2xl mx-auto">
                {rest.map((e, i) => (
                  <Row key={e.userId} entry={e} rank={i + 3} board={board} isMe={e.userId === meId} />
                ))}
              </ul>
            )}

            {/* Posisi saya kalau tidak masuk podium */}
            {meRank >= 3 && (
              <p className="mt-4 text-center text-xs text-slate-500">
                Kamu di peringkat <strong className="text-indigo-600">#{meRank + 1}</strong> dari {ranked.length}.{" "}
                {meRank + 1 === ranked.length ? "Dasar terdalam adalah awal dari kebangkitan 💪" : "Sikat terus!"}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
