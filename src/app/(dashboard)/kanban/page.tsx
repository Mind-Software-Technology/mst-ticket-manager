"use client";

// =====================================================
// Kanban Page — Papan pemantauan tiket
//
// Kolom = state tiket (urutan alur kerja). Kartu bisa di-drag antar
// kolom selama transisinya legal menurut STATE_TRANSITIONS; kolom tujuan
// yang tidak legal diredupkan. Data refresh otomatis tiap 60 detik.
// =====================================================

import { useMemo, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useKanbanTickets } from "@/hooks/useKanbanTickets";
import { useUsers } from "@/hooks/useUsers";
import { toISODate } from "@/lib/date-utils";
import { avatarGradient, initials } from "@/lib/leaderboard";
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_BY_VALUE,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_BY_VALUE,
  TICKET_STATES,
} from "@/lib/constants";
import { isTerminalState, isValidStateTransition } from "@/lib/ticket-utils";
import type { Ticket, TicketState } from "@/types";

const RECENT_OPTIONS = [7, 14, 30] as const;

// Aksen warna tipis di atas tiap kolom (mengikuti warna state di constants).
const COLUMN_ACCENT: Record<TicketState, string> = {
  backlog: "border-t-slate-400",
  todo: "border-t-blue-500",
  need_fix: "border-t-amber-500",
  on_progress: "border-t-emerald-500",
  code_review: "border-t-purple-500",
  ready_for_qa: "border-t-cyan-500",
  in_qa: "border-t-teal-500",
  ready_to_deploy: "border-t-indigo-500",
  done: "border-t-green-500",
  cancel: "border-t-red-500",
};

const PRIORITY_BAR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  normal: "bg-indigo-400",
  low: "bg-slate-300",
};

type DueStatus = "overdue" | "today" | "soon" | "ok" | "none";

function dueStatus(t: Ticket, today: string): DueStatus {
  if (!t.due_date || t.state === "done" || t.state === "cancel") return "none";
  if (t.due_date < today) return "overdue";
  if (t.due_date === today) return "today";
  const diff = (new Date(t.due_date).getTime() - new Date(today).getTime()) / 86400000;
  return diff <= 2 ? "soon" : "ok";
}

const DUE_STYLE: Record<DueStatus, string> = {
  overdue: "text-red-600 bg-red-50 font-semibold",
  today: "text-orange-600 bg-orange-50 font-semibold",
  soon: "text-amber-600 bg-amber-50",
  ok: "text-slate-500 bg-slate-50",
  none: "text-slate-400",
};

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function KanbanPage() {
  const router = useRouter();
  const { session } = useSession();
  const meId = session?.profile.id;

  const [recentDays, setRecentDays] = useState<(typeof RECENT_OPTIONS)[number]>(14);
  const [showCancel, setShowCancel] = useState(false);
  const [search, setSearch] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overState, setOverState] = useState<TicketState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { tickets, loading, error, updatedAt, refresh, moveTicket } = useKanbanTickets(
    meId,
    recentDays,
    showCancel,
  );
  const { users } = useUsers(true);

  const today = toISODate(new Date());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      const assigneeIds = [t.assigned_to, ...(t.additional_assignees ?? []).map((u) => u.id)];
      if (onlyMine && (!meId || !assigneeIds.includes(meId))) return false;
      if (assignee === "__none__" ? t.assigned_to : assignee && !assigneeIds.includes(assignee)) return false;
      if (priority && t.priority !== priority) return false;
      if (category && t.category !== category) return false;
      if (q && !`${t.ticket_id} ${t.subject}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, search, assignee, priority, category, onlyMine, meId]);

  const columns = useMemo(() => {
    const states = TICKET_STATES.filter((s) => showCancel || s.value !== "cancel");
    const byState = new Map<TicketState, Ticket[]>();
    for (const s of states) byState.set(s.value, []);
    for (const t of filtered) byState.get(t.state)?.push(t);
    // Dalam kolom: prioritas tertinggi dulu, lalu deadline terdekat.
    for (const list of byState.values()) {
      list.sort(
        (a, b) =>
          (TICKET_PRIORITY_BY_VALUE[a.priority]?.level ?? 9) - (TICKET_PRIORITY_BY_VALUE[b.priority]?.level ?? 9) ||
          (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"),
      );
    }
    return states.map((s) => ({ state: s, tickets: byState.get(s.value) ?? [] }));
  }, [filtered, showCancel]);

  const summary = useMemo(() => {
    const open = filtered.filter((t) => t.state !== "done" && t.state !== "cancel");
    return {
      open: open.length,
      overdue: open.filter((t) => dueStatus(t, today) === "overdue").length,
      dueToday: open.filter((t) => dueStatus(t, today) === "today").length,
      critical: open.filter((t) => t.priority === "critical").length,
      unassigned: open.filter((t) => !t.assigned_to).length,
    };
  }, [filtered, today]);

  const hasFilter = !!(search || assignee || priority || category || onlyMine);
  const dragged = dragId ? tickets.find((t) => t.id === dragId) : undefined;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const canDrop = (to: TicketState) => !!dragged && isValidStateTransition(dragged.state, to);

  const handleDrop = async (e: DragEvent, to: TicketState) => {
    e.preventDefault();
    const id = dragId;
    setDragId(null);
    setOverState(null);
    if (!id || !dragged || dragged.state === to) return;
    if (!isValidStateTransition(dragged.state, to)) {
      showToast("Perpindahan itu tidak diizinkan oleh alur state tiket.");
      return;
    }
    try {
      await moveTicket(id, to);
    } catch (err) {
      showToast((err as { message?: string })?.message || "Gagal memindahkan tiket.");
    }
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const advancedCount = [assignee, priority, category].filter(Boolean).length + (showCancel ? 1 : 0);

  const resetAll = () => {
    setSearch("");
    setAssignee("");
    setPriority("");
    setCategory("");
    setOnlyMine(false);
    setShowCancel(false);
  };

  const fieldCls =
    "py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  // Hanya tampilkan indikator yang perlu perhatian (nilai > 0).
  const alerts = [
    { label: "lewat deadline", value: summary.overdue, tone: "text-red-600 bg-red-50" },
    { label: "deadline hari ini", value: summary.dueToday, tone: "text-orange-600 bg-orange-50" },
    { label: "critical", value: summary.critical, tone: "text-rose-600 bg-rose-50" },
    { label: "belum di-assign", value: summary.unassigned, tone: "text-slate-600 bg-slate-100" },
  ].filter((a) => a.value > 0);

  return (
    <div className="p-4 md:p-6 flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header: satu baris */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="mr-auto">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Kanban</h1>
          <p className="text-xs text-slate-400">
            {summary.open} tiket aktif
            {updatedAt &&
              ` · ${updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tiket..."
            className={`${fieldCls} w-44 md:w-56 pl-8`}
          />
        </div>
        <button
          type="button"
          onClick={() => setOnlyMine((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            onlyMine ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Tiket Saya
        </button>
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filtersOpen || advancedCount > 0
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter
          {advancedCount > 0 && (
            <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-white text-slate-900 text-[10px] flex items-center justify-center">
              {advancedCount}
            </span>
          )}
        </button>
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

      {/* Filter lanjutan (tersembunyi secara default) */}
      {filtersOpen && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 mb-2 flex flex-wrap items-center gap-2">
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={fieldCls}>
            <option value="">Semua Assignee</option>
            <option value="__none__">Belum di-assign</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={fieldCls}>
            <option value="">Semua Prioritas</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls}>
            <option value="">Semua Kategori</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={recentDays}
            onChange={(e) => setRecentDays(Number(e.target.value) as (typeof RECENT_OPTIONS)[number])}
            className={fieldCls}
            title="Berapa lama tiket Done tetap tampil"
          >
            {RECENT_OPTIONS.map((d) => (
              <option key={d} value={d}>Done: {d} hari terakhir</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={showCancel} onChange={(e) => setShowCancel(e.target.checked)} />
            Tampilkan Cancel
          </label>
          {(hasFilter || showCancel) && (
            <button
              type="button"
              onClick={resetAll}
              className="ml-auto flex items-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      )}

      {/* Peringatan: hanya muncul kalau ada yang perlu diperhatikan */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {alerts.map((a) => (
            <span key={a.label} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${a.tone}`}>
              <strong>{a.value}</strong> {a.label}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Board */}
      {loading && tickets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat papan…
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden no-scrollbar">
          <div className="flex gap-2.5 h-full pb-2">
            {columns.map(({ state, tickets: list }) => {
              const droppable = canDrop(state.value);
              const dim = dragged && dragged.state !== state.value && !droppable;
              const highlight = overState === state.value && droppable;
              // Kolom kosong diciutkan jadi strip tipis, kecuali sedang jadi target drag.
              const collapsed = list.length === 0 && !droppable;
              const hours = list.reduce((sum, t) => sum + (Number(t.manhours_estimate) || 0), 0);

              if (collapsed) {
                return (
                  <div
                    key={state.value}
                    title={`${state.label} — kosong`}
                    className={`w-10 shrink-0 rounded-xl border border-slate-200 border-t-4 ${COLUMN_ACCENT[state.value]} bg-slate-100/50 flex items-start justify-center pt-3 ${dim ? "opacity-40" : ""}`}
                  >
                    <span className="text-[11px] font-semibold text-slate-400 [writing-mode:vertical-rl] whitespace-nowrap">
                      {state.label}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={state.value}
                  onDragOver={(e) => {
                    if (!droppable) return;
                    e.preventDefault();
                    setOverState(state.value);
                  }}
                  onDragLeave={() => setOverState((s) => (s === state.value ? null : s))}
                  onDrop={(e) => void handleDrop(e, state.value)}
                  className={`w-64 shrink-0 flex flex-col rounded-xl border border-slate-200 border-t-4 ${COLUMN_ACCENT[state.value]} transition-all ${
                    highlight ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-slate-100/70"
                  } ${dim ? "opacity-40" : ""}`}
                >
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    title={hours > 0 ? `Total estimasi ${hours} jam` : undefined}
                  >
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${state.color} ${state.textColor}`}>
                      {state.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{list.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2 space-y-2">
                    {list.length === 0 && (
                      <p className="text-center text-[11px] text-slate-400 py-6">Lepas di sini</p>
                    )}
                    {list.map((t) => (
                      <KanbanCard
                        key={t.id}
                        ticket={t}
                        today={today}
                        dragging={dragId === t.id}
                        draggable={!isTerminalState(t.state)}
                        onDragStart={() => setDragId(t.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverState(null);
                        }}
                        onOpen={() => router.push(`/gawean/${t.id}`)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  ticket: t,
  today,
  dragging,
  draggable,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  ticket: Ticket;
  today: string;
  dragging: boolean;
  draggable: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const due = dueStatus(t, today);
  const people = [t.assignee, ...(t.additional_assignees ?? [])].filter(Boolean) as Array<{ id: string; name: string }>;
  const actual = Number(t.actual_manhours) || 0;
  const estimate = Number(t.manhours_estimate) || 0;
  const details = [
    t.product?.name,
    TICKET_CATEGORY_BY_VALUE[t.category]?.label,
    estimate > 0 ? `${actual}/${estimate} jam` : null,
    t.need_qa ? "Perlu QA" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      draggable={draggable}
      title={details || undefined}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", t.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`relative bg-white rounded-lg border border-slate-200 shadow-sm pl-3 pr-2.5 py-2 overflow-hidden transition-all hover:shadow-md ${
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${dragging ? "opacity-40 rotate-1" : ""}`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${PRIORITY_BAR[t.priority] ?? "bg-slate-300"}`} />

      <span className="font-mono text-[10px] font-semibold text-slate-400">{t.ticket_id}</span>
      <p className="text-[13px] font-medium text-slate-900 leading-snug line-clamp-2">{t.subject}</p>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {t.due_date && due !== "none" ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${DUE_STYLE[due]}`} title="Deadline">
            {due === "overdue" ? "⚠ " : ""}
            {formatShort(t.due_date)}
          </span>
        ) : (
          <span />
        )}

        <div className="flex -space-x-1.5 shrink-0">
          {people.slice(0, 3).map((u) => (
            <span
              key={u.id}
              title={u.name}
              className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarGradient(u.id)} text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white`}
            >
              {initials(u.name)}
            </span>
          ))}
          {people.length > 3 && (
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[8px] font-bold flex items-center justify-center ring-2 ring-white">
              +{people.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
