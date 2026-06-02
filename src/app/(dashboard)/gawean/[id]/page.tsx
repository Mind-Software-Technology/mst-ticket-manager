"use client";

// =====================================================
// /gawean/[id] — Ticket Detail View
// Sprint 2 / Modul Gawean
//
// Layout:
//   - 2 kolom (md+): kiri detail card, kanan activity timeline
//   - State dropdown di header (validate transition + auto log)
//
// Edit form lengkap akan datang di Sprint 3.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock3,
  Loader2,
  Tag,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useSession } from "@/hooks/useSession";
import { writeActivityLog } from "@/hooks/useActivityLog";
import { canEditTicket, canUpdateState } from "@/lib/permissions";
import { isValidStateTransition } from "@/lib/ticket-utils";
import {
  TICKET_CATEGORY_BY_VALUE,
  TICKET_STATE_BY_VALUE,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { StateDropdown } from "@/components/gawean/StateDropdown";
import { TicketPriorityBadge } from "@/components/gawean/TicketPriorityBadge";
import { TicketStateBadge } from "@/components/gawean/TicketStateBadge";
import { ActivityTimeline } from "@/components/gawean/ActivityTimeline";
import type { Ticket, TicketState } from "@/types";

const TICKET_DETAIL_SELECT = `
  *,
  client:clients(id, name),
  product:products(id, name, prefix),
  project:projects(id, name),
  assignee:users!tickets_assigned_to_fkey(id, name, email, division),
  reporter:users!tickets_reported_to_fkey(id, name, email, division)
`;

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params?.id;
  const router = useRouter();
  const { session } = useSession();
  const profile = session?.profile ?? null;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateBusy, setStateBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bump untuk force-refresh activity timeline

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("tickets")
      .select(TICKET_DETAIL_SELECT)
      .eq("id", ticketId)
      .maybeSingle();

    if (queryError) {
      console.error("[TicketDetail] query error:", queryError);
      setError(queryError.message);
      setTicket(null);
    } else if (!data) {
      setError("Tiket tidak ditemukan");
      setTicket(null);
    } else {
      setTicket(data as unknown as Ticket);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  async function handleStateChange(next: TicketState) {
    if (!ticket || !profile) return;
    if (!isValidStateTransition(ticket.state, next)) {
      alert(
        `Transisi tidak valid: ${ticket.state} → ${next}. Refresh halaman.`,
      );
      return;
    }

    setStateBusy(true);

    const update: Record<string, unknown> = { state: next };
    if (next === "done" && !ticket.done_date) {
      update.done_date = new Date().toISOString().slice(0, 10);
    }

    const { error: updateErr } = await supabase
      .from("tickets")
      .update(update)
      .eq("id", ticket.id);

    if (updateErr) {
      console.error("[TicketDetail] state update failed:", updateErr);
      alert(`Gagal update state: ${updateErr.message}`);
      setStateBusy(false);
      return;
    }

    await writeActivityLog({
      ticket_id: ticket.id,
      user_id: profile.id,
      action_type: "state_change",
      field_changed: "state",
      old_value: ticket.state,
      new_value: next,
    });

    // Update local state + refresh timeline
    setTicket((prev) =>
      prev
        ? {
            ...prev,
            state: next,
            done_date:
              next === "done" && !prev.done_date
                ? new Date().toISOString().slice(0, 10)
                : prev.done_date,
          }
        : prev,
    );
    setRefreshKey((k) => k + 1);
    setStateBusy(false);
  }

  // ─── Render ──────────────────────────────────────

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-red-900">Gagal memuat tiket</h2>
            <p className="text-sm text-red-700 mt-1">
              {error ?? "Tiket tidak ditemukan."}
            </p>
            <Link
              href="/gawean"
              className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke daftar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canEdit = canEditTicket(ticket, profile);
  const canChangeState = canUpdateState(ticket, profile);
  const stateCfg = TICKET_STATE_BY_VALUE[ticket.state];
  const categoryLabel =
    TICKET_CATEGORY_BY_VALUE[ticket.category]?.label ?? ticket.category;

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link
          href="/gawean"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" /> Gawean
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-slate-500">{ticket.ticket_id}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          {/* Header card */}
          <header className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {ticket.ticket_id}
                  </span>
                  <TicketPriorityBadge priority={ticket.priority} />
                  <TicketStateBadge state={ticket.state} />
                  <span className="text-xs text-slate-500">
                    {categoryLabel}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                  {ticket.subject}
                </h1>
                {ticket.description && (
                  <p className="mt-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {ticket.description}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <StateDropdown
                  value={ticket.state}
                  canEdit={canChangeState}
                  loading={stateBusy}
                  onChange={handleStateChange}
                />
              </div>
            </div>
            {!canEdit && (
              <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
                <UserIcon className="w-3 h-3" /> Mode read-only — kamu bukan
                admin maupun assignee.
              </p>
            )}
          </header>

          {/* Field grid */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              Detail Tiket
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <Field
                label="Client"
                icon={<Tag className="w-3 h-3" />}
                value={ticket.client?.name ?? "—"}
              />
              <Field
                label="Product"
                icon={<Tag className="w-3 h-3" />}
                value={ticket.product?.name ?? "—"}
              />
              <Field
                label="Project"
                icon={<Tag className="w-3 h-3" />}
                value={ticket.project?.name ?? "—"}
              />
              <Field
                label="Divisi"
                value={ticket.division ?? "—"}
              />
              <Field
                label="Assignee"
                icon={<UserIcon className="w-3 h-3" />}
                value={ticket.assignee?.name ?? "—"}
              />
              <Field
                label="Reported To"
                icon={<UserIcon className="w-3 h-3" />}
                value={ticket.reporter?.name ?? "—"}
              />
              <Field
                label="Manhours Estimate"
                icon={<Clock3 className="w-3 h-3" />}
                value={`${ticket.manhours_estimate ?? 0} jam`}
              />
              <Field
                label="Actual Manhours"
                icon={<Clock3 className="w-3 h-3" />}
                value={`${ticket.actual_manhours ?? 0} jam`}
              />
              <Field
                label="Need QA?"
                value={ticket.need_qa ? "Ya" : "Tidak"}
              />
              <Field
                label="Start Date"
                icon={<CalendarDays className="w-3 h-3" />}
                value={ticket.start_date ? formatDate(ticket.start_date) : "—"}
              />
              <Field
                label="Due Date"
                icon={<CalendarClock className="w-3 h-3" />}
                value={ticket.due_date ? formatDate(ticket.due_date) : "—"}
              />
              <Field
                label="Done Date"
                icon={<CalendarDays className="w-3 h-3" />}
                value={
                  ticket.done_date ? formatDate(ticket.done_date) : (
                    <span className="text-slate-400 italic">—</span>
                  )
                }
              />
            </dl>

            <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>Dibuat: {formatDateTime(ticket.created_at)}</span>
              <span>Update terakhir: {formatDateTime(ticket.updated_at)}</span>
              {stateCfg && (
                <span>
                  State saat ini:{" "}
                  <span className="font-medium text-slate-700">
                    {stateCfg.label}
                  </span>
                </span>
              )}
            </div>
          </section>

          {canEdit && (
            <div className="text-xs text-slate-400 italic px-2">
              Tombol edit field & tombol komentar akan tersedia di Sprint 3.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <ActivityTimeline ticketId={ticket.id} key={refreshKey} />
      </div>
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-0.5">
        {icon}
        {label}
      </dt>
      <dd className="text-slate-900 break-words">{value}</dd>
    </div>
  );
}
