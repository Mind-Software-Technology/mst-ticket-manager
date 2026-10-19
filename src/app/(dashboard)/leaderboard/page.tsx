"use client";

// =====================================================
// Leaderboard Page — Papan Peringkat
//
// Tiga grup: Check-In (streak, rajin, pagi), Tiket (selesai, jam
// kerja, tepat waktu, urgent, beban, molor) dan Minigame berbasis
// tiket. Papan tiket bisa difilter periode dan kategori tiket.
// =====================================================

import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Share2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useCheckinLeaderboard } from "@/hooks/useCheckinLeaderboard";
import {
  PERIOD_LABELS,
  useTicketLeaderboard,
  type LeaderboardPeriod,
} from "@/hooks/useTicketLeaderboard";
import { LeaderboardBoard } from "@/components/LeaderboardBoard";
import { ShareLeaderboardModal } from "@/components/ShareLeaderboardModal";
import { MinigameHub } from "@/components/minigames/MinigameHub";
import { TICKET_CATEGORIES } from "@/lib/constants";
import {
  BOARDS,
  BOARD_KEYS_BY_GROUP,
  checkinRows,
  ticketRows,
  type BoardGroup,
  type BoardKey,
  type CheckinBoardKey,
  type TicketBoardKey,
} from "@/lib/leaderboard";
import type { TicketCategory } from "@/types";

type PageGroup = BoardGroup | "game";

const GROUPS: Array<{ key: PageGroup; label: string; emoji: string }> = [
  { key: "checkin", label: "Check-In", emoji: "📋" },
  { key: "ticket", label: "Tiket (Gawean)", emoji: "🎫" },
  { key: "game", label: "Minigame", emoji: "🎮" },
];

export default function LeaderboardPage() {
  const { session } = useSession();
  const meId = session?.profile.id;

  const [group, setGroup] = useState<PageGroup>("checkin");
  const isGame = group === "game";
  const boardGroup: BoardGroup = group === "game" ? "ticket" : group;
  const [board, setBoard] = useState<BoardKey>("streak");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [shareOpen, setShareOpen] = useState(false);

  const checkin = useCheckinLeaderboard();
  const tickets = useTicketLeaderboard(period, category);

  const switchGroup = (g: PageGroup) => {
    setGroup(g);
    if (g !== "game") setBoard(BOARD_KEYS_BY_GROUP[g][0]);
  };

  // Pakai group milik `board` (bukan `group`): di tab "game" board tidak berganti,
  // jadi board check-in bisa sempat dipasangkan dengan papan tiket.
  const rows = useMemo(
    () =>
      BOARDS[board].group === "checkin"
        ? checkinRows(checkin.entries, board as CheckinBoardKey)
        : ticketRows(tickets.entries, board as TicketBoardKey),
    [board, checkin.entries, tickets.entries],
  );

  const active = group === "checkin" ? checkin : tickets;
  const doneToday = checkin.entries.filter((e) => e.checkedInToday).length;
  // Papan beban & molor memakai tiket aktif saat ini, jadi periode tidak berpengaruh.
  const periodApplies = board !== "beban" && board !== "molor";

  // Keterangan konteks yang ikut tercetak di gambar yang dibagikan.
  const shareSubtitle = useMemo(() => {
    if (group === "checkin") {
      return board === "streak"
        ? "Streak saat ini"
        : board === "rajin"
          ? new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })
          : "30 hari terakhir";
    }
    const parts = [periodApplies ? PERIOD_LABELS[period] : "Tiket aktif saat ini"];
    if (category) parts.push(TICKET_CATEGORIES.find((c) => c.value === category)?.label ?? category);
    return parts.join(" · ");
  }, [group, board, period, category, periodApplies]);

  const chip = (selected: boolean, tone: string) =>
    `px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
      selected ? tone : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <div className="p-4 md:p-8">
      <section className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        {/* Header */}
        <div className="px-4 md:px-6 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span className="animate-lb-float inline-block">🏆</span> Papan Peringkat
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isGame
                ? "🎮 Istirahat sebentar — main minigame dari tiket tim!"
                : `${BOARDS[board].emoji} ${BOARDS[board].tagline}`}
              {!isGame && group === "checkin" && checkin.entries.length > 0 && (
                <span className="ml-2 text-slate-400">
                  · {doneToday}/{checkin.entries.length} sudah check-in hari ini
                </span>
              )}
            </p>
          </div>
          {!isGame && (
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={rows.length === 0}
            title="Bagikan sebagai gambar"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:opacity-90 disabled:opacity-40"
          >
            <Share2 className="w-3.5 h-3.5" /> Bagikan
          </button>
          <button
            type="button"
            onClick={() => void active.refresh()}
            disabled={active.loading}
            title="Segarkan"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${active.loading ? "animate-spin" : ""}`} />
          </button>
          </div>
          )}
        </div>

        {/* Grup */}
        <div className="px-4 md:px-6 flex gap-2 border-b border-slate-100 pb-3">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => switchGroup(g.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                group === g.key
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {isGame ? (
          <div className="px-4 md:px-6 pb-6">
            <MinigameHub userId={meId} userName={session?.profile.name} />
          </div>
        ) : (
        <>
        {/* Papan */}
        <div className="px-4 md:px-6 pt-3 flex gap-2 flex-wrap">
          {BOARD_KEYS_BY_GROUP[boardGroup].map((key) => (
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

        <p className="px-4 md:px-6 pt-2 text-[11px] text-slate-400">ℹ️ {BOARDS[board].how}</p>

        {/* Filter tiket */}
        {group === "ticket" && (
          <div className="px-4 md:px-6 pt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Periode
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as LeaderboardPeriod)}
                disabled={!periodApplies}
                title={periodApplies ? undefined : "Papan ini menghitung tiket aktif saat ini"}
                className="py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
                  <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={chip(category === "", "bg-emerald-600 border-emerald-600 text-white")}
              >
                Semua Kategori
              </button>
              {TICKET_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={chip(category === c.value, "bg-emerald-600 border-emerald-600 text-white")}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 md:px-6 pb-6">
          {active.error && <p className="mt-3 text-sm text-red-600">{active.error}</p>}
          {active.loading && active.entries.length === 0 ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Menghitung siapa yang paling jago…
            </div>
          ) : (
            <LeaderboardBoard board={board} rows={rows} meId={meId} />
          )}
        </div>
        </>
        )}
      </section>

      {shareOpen && (
        <ShareLeaderboardModal
          board={board}
          rows={rows}
          subtitle={shareSubtitle}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
