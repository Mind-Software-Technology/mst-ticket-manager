"use client";

// =====================================================
// Gawean List Page — Ticket Management
// Sprint 2 / Gawean Module
//
// Main ticket list dengan filter, search, pagination, dan
// "Group By" gaya Odoo (kelompokkan tiket per field).
//
// State disimpan di module-level variable agar survive
// mount/unmount component saat navigasi ke detail lalu
// kembali. Juga di-backup ke sessionStorage untuk jaga-
// jaga kalau module di-reload (full page refresh).
// =====================================================

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, ChevronRight, ChevronDown } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useTickets } from "@/hooks/useTickets";
import { Badge, Button, Pagination, EmptyState } from "@/components/ui";
import { TicketFilterBar } from "@/components/TicketFilterBar";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import {
  groupTickets,
  GROUP_DEF_BY_KEY,
  GROUP_FETCH_LIMIT,
} from "@/lib/ticket-grouping";
import type { Ticket, TicketFilters, PaginationParams } from "@/types";

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Module-level persist ─────────────────────────────
// State ini survive mount/unmount component di tab yang sama.

const STORAGE_KEY = "gawean_v2";

interface PersistedState {
  filters: TicketFilters;
  pagination: PaginationParams;
  groupBy: string | null;
}

let persisted: PersistedState | null = null;

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  if (persisted) return persisted;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      persisted = JSON.parse(raw) as PersistedState;
      return persisted;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function savePersisted(state: PersistedState) {
  persisted = state;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearPersisted() {
  persisted = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function defaultFilters(): TicketFilters {
  return {
    search: "",
    state: [],
    priority: [],
    category: [],
    assign_to_me: true,
    report_to_me: false,
  };
}

function defaultPagination(): PaginationParams {
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "created_at",
    sortOrder: "desc",
  };
}

// ─── Component ────────────────────────────────────────

export default function GaweanPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const currentUserId = session?.profile?.id;
  const isAdmin = Boolean(session?.profile?.is_admin);
  const canCreateTicket = isAdmin || session?.email === "gema@mst.id";

  // Restore dari module-level state or sessionStorage
  const [state, setState] = useState<PersistedState>(() => {
    if (typeof window !== "undefined") {
      return loadPersisted() ?? {
        filters: defaultFilters(),
        pagination: defaultPagination(),
        groupBy: null,
      };
    }
    return {
      filters: defaultFilters(),
      pagination: defaultPagination(),
      groupBy: null,
    };
  });

  // Pastikan sinkron dengan sessionStorage setelah mount (menghindari hydration mismatch)
  useEffect(() => {
    const loaded = loadPersisted();
    if (loaded) {
      setState(loaded);
    }
  }, []);

  const { filters, pagination, groupBy } = state;
  const grouping = groupBy !== null;

  // Collapsed group — tidak perlu survive navigasi.
  // Default: SEMUA grup tertutup, baru dibuka kalau diklik.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Simpan ke module-level + sessionStorage tiap state berubah
  useEffect(() => {
    savePersisted(state);
  }, [state]);

  // Merge sebagian filter + reset page ke 1
  const patchFilters = (patch: Partial<TicketFilters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...patch },
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  const clearAllFilters = () => {
    clearPersisted();
    setState({
      filters: defaultFilters(),
      pagination: defaultPagination(),
      groupBy: null,
    });
    setCollapsed(new Set());
  };

  const handlePageChange = (page: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
  };

  const handleGroupByChange = (key: string | null) => {
    setState((prev) => ({
      ...prev,
      groupBy: key,
      pagination: { ...prev.pagination, page: 1 },
    }));
    // Reset collapsed — akan diisi ulang oleh useEffect saat groups terbentuk
    setCollapsed(new Set(["__reset__"]));
  };

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (sortBy: string) => {
    setState((prev) => {
      const newOrder =
        prev.pagination.sortBy === sortBy && prev.pagination.sortOrder === "asc"
          ? "desc"
          : "asc";
      return {
        ...prev,
        pagination: { ...prev.pagination, sortBy, sortOrder: newOrder, page: 1 },
      };
    });
  };

  // Simpan state lalu navigasi ke detail
  const navigateToDetail = (ticketId: string) => {
    savePersisted(state);
    router.push(`/gawean/${ticketId}`);
  };

  // ─── Derived data ───────────────────────────────────

  const effectivePagination: PaginationParams = grouping
    ? { ...pagination, page: 1, pageSize: GROUP_FETCH_LIMIT }
    : pagination;

  const {
    tickets,
    loading: ticketsLoading,
    error,
    total,
    totalPages,
  } = useTickets(
    {
      ...filters,
      assigned_to: filters.assign_to_me
        ? currentUserId || "00000000-0000-0000-0000-000000000000"
        : filters.assigned_to,
      reported_to: filters.report_to_me
        ? currentUserId || "00000000-0000-0000-0000-000000000000"
        : filters.reported_to,
    },
    effectivePagination,
  );

  const loading = ticketsLoading || sessionLoading;

  const groups = useMemo(
    () => (grouping ? groupTickets(tickets, groupBy) : []),
    [grouping, tickets, groupBy],
  );

  // Setiap kali daftar grup berubah, pastikan semua grup default tertutup
  useEffect(() => {
    if (!grouping || groups.length === 0) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const g of groups) {
        if (!next.has(g.id)) {
          next.add(g.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [grouping, groups]);

  const groupLabel = groupBy ? GROUP_DEF_BY_KEY[groupBy]?.label : "";
  const groupedCount = grouping
    ? groups.reduce((sum, g) => sum + g.tickets.length, 0)
    : 0;

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gawean (Tickets)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola semua tiket pekerjaan tim
          </p>
        </div>
        {canCreateTicket ? (
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push("/gawean/new")}
          >
            Buat Tiket Baru
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push("/gawean/request")}
          >
            Ajukan Tiket Baru
          </Button>
        )}
      </div>

      {/* Toolbar: Search + Filters + Group By (gaya Odoo) */}
      <TicketFilterBar
        filters={filters}
        onChange={patchFilters}
        onClearAll={clearAllFilters}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
      />

      {/* Info grup aktif */}
      {grouping && !loading && (
        <div className="mb-3 text-sm text-slate-600">
          Dikelompokkan menurut{" "}
          <span className="font-semibold text-slate-800">{groupLabel}</span> —{" "}
          {groups.length} grup, {groupedCount} tiket
          {total > GROUP_FETCH_LIMIT && (
            <span className="ml-1 text-amber-600">
              (hanya {GROUP_FETCH_LIMIT} dari {total} tiket yang
              dikelompokkan)
            </span>
          )}
        </div>
      )}

      {/* Ticket Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-medium w-32">
                  <button
                    onClick={() => handleSort("ticket_id")}
                    className="hover:text-indigo-600"
                  >
                    ID Tiket
                  </button>
                </th>
                <th className="p-4 font-medium">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="hover:text-indigo-600"
                  >
                    Created on
                  </button>
                </th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Client</th>
                <th className="p-4 font-medium">
                  <button
                    onClick={() => handleSort("priority")}
                    className="hover:text-indigo-600"
                  >
                    Priority
                  </button>
                </th>
                <th className="p-4 font-medium">Reported To</th>
                <th className="p-4 font-medium">Assignee</th>
                <th className="p-4 font-medium">
                  <button
                    onClick={() => handleSort("due_date")}
                    className="hover:text-indigo-600"
                  >
                    Due Date
                  </button>
                </th>
                <th className="p-4 font-medium text-center">Manhours</th>
                <th className="p-4 font-medium">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Memuat tiket...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      title="Tidak ada tiket"
                      description="Belum ada tiket yang sesuai dengan filter. Coba ubah filter atau buat tiket baru."
                      action={
                        <Button
                          variant="primary"
                          onClick={() =>
                            router.push(
                              canCreateTicket ? "/gawean/new" : "/gawean/request",
                            )
                          }
                        >
                          {canCreateTicket ? "Buat Tiket Pertama" : "Ajukan Tiket Pertama"}
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ) : grouping ? (
                // ─── Tampilan dikelompokkan ───────────────
                groups.map((group) => {
                  const isCollapsed = collapsed.has(group.id);
                  return (
                    <Fragment key={group.id}>
                      <tr
                        onClick={() => toggleGroup(group.id)}
                        className="bg-slate-50 hover:bg-slate-100 cursor-pointer border-b border-slate-200"
                      >
                        <td colSpan={8} className="p-3">
                          <div className="flex items-center gap-2 font-semibold text-slate-700">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{group.label}</span>
                            <span className="text-slate-400 font-normal">
                              ({group.tickets.length})
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">
                          {group.manhoursTotal}h
                        </td>
                        <td className="p-3" />
                      </tr>
                      {!isCollapsed &&
                        group.tickets.map((ticket) => (
                          <TicketRow
                            key={ticket.id}
                            ticket={ticket}
                            onClick={() => navigateToDetail(ticket.id)}
                          />
                        ))}
                    </Fragment>
                  );
                })
              ) : (
                // ─── Tampilan tabel biasa ─────────────────
                tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => navigateToDetail(ticket.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — hanya saat tidak mengelompok */}
        {!loading && !grouping && tickets.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            pageSize={pagination.pageSize}
            totalItems={total}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}

// ─── Baris tiket (dipakai tabel biasa & grup) ──────────

function TicketRow({
  ticket,
  onClick,
}: {
  ticket: Ticket;
  onClick: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-slate-50 transition-colors cursor-pointer"
    >
      <td className="p-4">
        <span className="font-mono text-xs font-semibold text-indigo-600">
          {ticket.ticket_id}
        </span>
      </td>
      <td className="p-4 text-slate-600 whitespace-nowrap">
        {formatDate(ticket.created_at)}
      </td>
      <td className="p-4 text-slate-700 max-w-md">
        <div className="truncate">{ticket.subject}</div>
      </td>
      <td className="p-4">
        <span className="text-slate-600">{ticket.client?.name || "-"}</span>
      </td>
      <td className="p-4">
        <Badge variant="priority" priority={ticket.priority} />
      </td>
      <td className="p-4">
        <span className="text-slate-700">{ticket.reporter?.name || "-"}</span>
      </td>
      <td className="p-4">
        <span className="text-slate-700">
          {[ticket.assignee?.name, ...(ticket.additional_assignees ?? []).map((u) => u.name)]
            .filter(Boolean)
            .join(", ") || "-"}
        </span>
      </td>
      <td className="p-4 text-slate-600">{formatDate(ticket.due_date)}</td>
      <td className="p-4 text-center">
        <span className="text-slate-600">{ticket.manhours_estimate || 0}h</span>
      </td>
      <td className="p-4">
        <Badge variant="state" state={ticket.state} />
      </td>
    </tr>
  );
}
