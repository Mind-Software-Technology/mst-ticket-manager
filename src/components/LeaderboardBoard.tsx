"use client";

// =====================================================
// LeaderboardBoard — tampilan podium + daftar peringkat
//
// Presentasional murni: menerima BoardRow yang sudah diurutkan,
// dipakai untuk semua papan (check-in maupun tiket).
// =====================================================

import { Crown } from "lucide-react";
import { BOARDS, avatarGradient, initials, type BoardKey, type BoardRow } from "@/lib/leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

// Urutan tampilan podium: juara 2 – juara 1 – juara 3
const PODIUM_ORDER = [1, 0, 2] as const;

const PODIUM_STYLE = [
  { height: "h-28", ring: "ring-amber-300", glow: "shadow-amber-300/60", base: "from-amber-300 to-yellow-500" },
  { height: "h-20", ring: "ring-slate-300", glow: "shadow-slate-300/60", base: "from-slate-300 to-slate-400" },
  { height: "h-14", ring: "ring-orange-300", glow: "shadow-orange-300/60", base: "from-orange-300 to-amber-600" },
] as const;

function Avatar({ row, size }: { row: BoardRow; size: "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br ${avatarGradient(row.userId)} text-white font-black flex items-center justify-center select-none`}
    >
      {initials(row.name)}
    </div>
  );
}

function PodiumSpot({ row, rank, unit, meId }: { row: BoardRow; rank: number; unit: string; meId?: string }) {
  const style = PODIUM_STYLE[rank];
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        {rank === 0 && <Crown className="w-7 h-7 text-amber-400 fill-amber-300 animate-lb-crown absolute -top-8" />}
        <div className={`rounded-full ring-4 ${style.ring} shadow-xl ${style.glow} ${rank === 0 ? "animate-lb-float" : ""}`}>
          <Avatar row={row} size="lg" />
        </div>
      </div>

      <p className="mt-2 text-sm font-bold text-slate-900 text-center truncate max-w-full px-1">
        {row.name}
        {row.userId === meId && <span className="ml-1 text-[10px] font-semibold text-indigo-600">(kamu)</span>}
      </p>
      <p className="text-[11px] leading-tight text-slate-500 text-center italic px-1 min-h-[2.2em]">{row.title}</p>

      <div
        className={`mt-2 w-full ${style.height} rounded-t-xl bg-gradient-to-b ${style.base} flex flex-col items-center justify-center text-white shadow-inner`}
      >
        <span className="text-2xl">{MEDALS[rank]}</span>
        <span className="text-lg font-black leading-none drop-shadow">
          {row.score}
          {unit && <span className="text-[10px] font-semibold ml-0.5">{unit}</span>}
        </span>
      </div>
    </div>
  );
}

function Row({ row, rank, unit, isMe }: { row: BoardRow; rank: number; unit: string; isMe: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isMe ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white hover:bg-slate-50"
      }`}
    >
      <span className="w-7 text-center text-sm font-black text-slate-400">#{rank + 1}</span>
      <Avatar row={row} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {row.name}
          {isMe && <span className="ml-1.5 text-[10px] font-semibold text-indigo-600">(kamu)</span>}
          {row.badge && (
            <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
              {row.badge}
            </span>
          )}
        </p>
        <p className="text-[11px] text-slate-500 italic truncate">{row.title}</p>
        {row.note && <p className="text-[10px] text-slate-400 truncate">{row.note}</p>}
        {row.progress && (
          <div className="mt-1.5">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600"
                style={{ width: `${row.progress.pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] text-slate-400">{row.progress.label}</p>
          </div>
        )}
        {row.nudge && (
          <p className={`text-[10px] mt-0.5 truncate ${isMe ? "text-rose-600 font-semibold" : "text-amber-600"}`}>
            {row.nudge}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xl font-black leading-none bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 bg-clip-text text-transparent">
          {row.score}
        </p>
        {unit && <p className="text-[10px] text-slate-400">{unit}</p>}
      </div>
    </li>
  );
}

export function LeaderboardBoard({ board, rows, meId }: { board: BoardKey; rows: BoardRow[]; meId?: string }) {
  const cfg = BOARDS[board];
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meRank = meId ? rows.findIndex((r) => r.userId === meId) : -1;

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">{cfg.empty}</p>;
  }

  return (
    <div className="pt-8">
      <div className="flex items-end gap-2 md:gap-4 max-w-xl mx-auto">
        {PODIUM_ORDER.map((idx) =>
          top[idx] ? (
            <PodiumSpot key={top[idx].userId} row={top[idx]} rank={idx} unit={cfg.unit} meId={meId} />
          ) : (
            <div key={idx} className="flex-1" />
          ),
        )}
      </div>

      {rest.length > 0 && (
        <ul className="mt-5 space-y-1.5 max-w-2xl mx-auto">
          {rest.map((r, i) => (
            <Row key={r.userId} row={r} rank={i + 3} unit={cfg.unit} isMe={r.userId === meId} />
          ))}
        </ul>
      )}

      {meRank >= 3 && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Kamu di peringkat <strong className="text-indigo-600">#{meRank + 1}</strong> dari {rows.length}.{" "}
          {meRank + 1 === rows.length ? "Dasar terdalam adalah awal dari kebangkitan 💪" : "Sikat terus!"}
        </p>
      )}
      {meId && meRank === -1 && (
        <p className="mt-4 text-center text-xs text-slate-400">Kamu belum masuk papan ini. Yuk mulai! 💫</p>
      )}
    </div>
  );
}
