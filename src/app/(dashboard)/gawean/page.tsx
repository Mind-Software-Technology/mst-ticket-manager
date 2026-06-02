"use client";

// =====================================================
// /gawean — Ticket List View
// Sprint 2 / Modul Gawean
//
// Fitur:
//   - 9 kolom: Created on, Due Date, Client, Subject, Priority,
//     Reported To, Assignee, Manhours, State (badge berwarna)
//   - Search debounced (subject + ticket_id)
//   - Quick filter "Assign to Me" (default ON utk non-admin)
//   - Pagination 20/page
//   - Sort by created_at DESC default
//   - Tombol "+ New Ticket" — admin only (placeholder, akan di Sprint 3)
// =====================================================

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListChecks, Plus, UserCheck, AlertCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useTickets } from "@/hooks/useTickets";
import { TicketStateBadge } from "@/components/gawean/TicketStateBadge";
import { TicketPriorityBadge } from "@/components/gawean/TicketPriorityBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { canCreateTicket } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/date-utils";
import type { PaginationParams, TicketFilters } from "@/types";

export default function GaweanListPage() {
  const { session } = useSession();
  const profile = session?.profile ?? null;

  const [search, setSearch] = useState("");
  // Default: non-admin lihat tugasnya sendiri dulu, admin lihat semua
  const [assignToMe, setAssignToMe] = useState(() => !profile?.is_admin);
  const [page, setPage] = useState(1);

  const filters = useMemo<TicketFilters>(
    () => ({
      search: search || undefined,
      assigned_to: assignToMe && profile ? profile.id : undefined,
    }),
    [search, assignToMe, profile],
  );

  const pagination = useMemo<PaginationParams>(
    () => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sortBy: "created_at",
      sortOrder: "desc",
    }),
    [page],
  );

  const { tickets, total, loading, error } = useTickets(filters, pagination);

  // Reset page kalau filter berubah
  const handleSearchChange = (v: string) => {
    setPage(1);
    setSearch(v);
  };
  const handleAssignToMeToggle = () => {
    setPage(1);
    setAssignToMe((v) => !v);
  };

  return (
    <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Gawean</h1>
          <p className="text-sm text-slate-500">
            Daftar tiket pekerjaan tim MST
          </p>
        </div>
        {canCreateTicket(profile) && (
          <button
            type="button"
            disabled
            title="Form create ticket akan tersedia di Sprint 3"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm opacity-60 cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Buat Tiket Baru
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-slate-100">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari subject atau ID tiket (e.g. ZB-1)"
            className="md:max-w-sm flex-1"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAssignToMeToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                assignToMe
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Tugas Saya
              {assignToMe && (
                <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 text-[10px]">
                  ×
                </span>
              )}
            </button>
            <span className="text-xs text-slate-500 ml-auto">
              <Pagination
                page={page}
                pageSize={DEFAULT_PAGE_SIZE}
                total={total}
                onChange={setPage}
              />
            </span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <strong>Gagal memuat tiket:</strong> {error}
              <p className="text-xs mt-0.5">
                Cek koneksi Supabase, atau buka{" "}
                <Link href="/debug" className="underline">
                  /debug
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Due Date</th>
                <th className="text-left p-3 font-medium">Client</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Priority</th>
                <th className="text-left p-3 font-medium">Reported</th>
                <th className="text-left p-3 font-medium">Assignee</th>
                <th className="text-right p-3 font-medium">MH</th>
                <th className="text-left p-3 font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Memuat tiket...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <EmptyState
                      icon={ListChecks}
                      title={
                        assignToMe
                          ? "Tidak ada tiket untuk kamu"
                          : "Belum ada tiket"
                      }
                      description={
                        assignToMe
                          ? "Coba matikan filter “Tugas Saya” atau hubungi admin."
                          : profile?.is_admin
                            ? "Klik tombol “Buat Tiket Baru” untuk memulai."
                            : "Tunggu admin menambahkan tiket."
                      }
                    />
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(t.created_at, "numeric")}
                    </td>
                    <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                      {t.due_date ? formatDate(t.due_date, "numeric") : "-"}
                    </td>
                    <td className="p-3 text-xs text-slate-700 max-w-[140px] truncate">
                      {t.client?.name ?? "-"}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/gawean/${t.id}`}
                        className="block max-w-[420px]"
                      >
                        <span className="text-[10px] font-mono text-slate-500 mr-1.5">
                          {t.ticket_id}
                        </span>
                        <span className="text-slate-900 font-medium hover:text-indigo-600 transition-colors line-clamp-2">
                          {t.subject}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3">
                      <TicketPriorityBadge priority={t.priority} compact />
                    </td>
                    <td className="p-3 text-xs text-slate-700 max-w-[120px] truncate">
                      {t.reporter?.name ?? "-"}
                    </td>
                    <td className="p-3 text-xs text-slate-700 max-w-[120px] truncate">
                      {t.assignee?.name ?? (
                        <span className="text-slate-400 italic">unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-600 text-right tabular-nums">
                      {t.manhours_estimate || 0}
                    </td>
                    <td className="p-3">
                      <TicketStateBadge state={t.state} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
        {total > 0 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
            <Pagination
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              total={total}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
