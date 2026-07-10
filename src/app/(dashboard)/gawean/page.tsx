"use client";

// =====================================================
// Gawean List Page — Ticket Management
// Sprint 2 / Gawean Module
//
// Main ticket list dengan filter, search, pagination, dan
// "Group By" gaya Odoo (kelompokkan tiket per field).
//
// State filter/pagination/groupBy disimpan di URL search
// params agar tidak hilang saat navigasi ke detail lalu
// kembali (browser back).
// =====================================================

import { Fragment, Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import type {
  Ticket,
  TicketFilters,
  TicketState,
  TicketPriority,
  TicketCategory,
  DuePreset,
  PaginationParams,
} from "@/types";

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── URL search params helpers ────────────────────────

const DUE_PRESET_VALUES = ["today", "this_week", "this_month", "this_year"];

function parseFiltersFromParams(sp: URLSearchParams): TicketFilters {
  const stateRaw = sp.get("s");
  const priorityRaw = sp.get("p");
  const categoryRaw = sp.get("c");
  const dueRaw = sp.get("due");
  const hasAnyParams = Array.from(sp.entries()).length > 0;

  return {
    search: sp.get("q") ?? "",
    state: stateRaw
      ? (stateRaw.split(",").filter(Boolean) as TicketState[])
      : [],
    priority: priorityRaw
      ? (priorityRaw.split(",").filter(Boolean) as TicketPriority[])
      : [],
    category: categoryRaw
      ? (categoryRaw.split(",").filter(Boolean) as TicketCategory[])
      : [],
    assign_to_me:
      hasAnyParams ? sp.has("me") : true,
    not_closed: sp.has("nc"),
    overdue: sp.has("od"),
    due_preset: (dueRaw && DUE_PRESET_VALUES.includes(dueRaw)
      ? dueRaw
      : undefined) as DuePreset | undefined,
    due_date_from: sp.get("due_f") || undefined,
    due_date_to: sp.get("due_t") || undefined,
    done_date_from: sp.get("done_f") || undefined,
    done_date_to: sp.get("done_t") || undefined,
    created_from: sp.get("cr_f") || undefined,
    created_to: sp.get("cr_t") || undefined,
    assignee_name: sp.get("as") || undefined,
    reporter_name: sp.get("rp") || undefined,
    client_id: sp.get("cl") || undefined,
    product_id: sp.get("pr") || undefined,
    project_id: sp.get("pj") || undefined,
    sprint_id: sp.get("sp") || undefined,
  };
}

function parsePaginationFromParams(sp: URLSearchParams): PaginationParams {
  return {
    page: Math.max(1, parseInt(sp.get("pg") ?? "1", 10) || 1),
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: sp.get("sort") || "created_at",
    sortOrder: sp.get("o") === "asc" ? "asc" : "desc",
  };
}

function serializeToParams(
  filters: TicketFilters,
  pagination: PaginationParams,
  groupBy: string | null,
): URLSearchParams {
  const sp = new URLSearchParams();

  if (filters.search) sp.set("q", filters.search);
  if (filters.assign_to_me) sp.set("me", "1");
  if (filters.not_closed) sp.set("nc", "1");
  if (filters.overdue) sp.set("od", "1");
  if (filters.state?.length) sp.set("s", filters.state.join(","));
  if (filters.priority?.length) sp.set("p", filters.priority.join(","));
  if (filters.category?.length) sp.set("c", filters.category.join(","));
  if (filters.due_preset) sp.set("due", filters.due_preset);
  if (filters.due_date_from) sp.set("due_f", filters.due_date_from);
  if (filters.due_date_to) sp.set("due_t", filters.due_date_to);
  if (filters.done_date_from) sp.set("done_f", filters.done_date_from);
  if (filters.done_date_to) sp.set("done_t", filters.done_date_to);
  if (filters.created_from) sp.set("cr_f", filters.created_from);
  if (filters.created_to) sp.set("cr_t", filters.created_to);
  if (filters.assignee_name) sp.set("as", filters.assignee_name);
  if (filters.reporter_name) sp.set("rp", filters.reporter_name);
  if (filters.client_id) sp.set("cl", filters.client_id);
  if (filters.product_id) sp.set("pr", filters.product_id);
  if (filters.project_id) sp.set("pj", filters.project_id);
  if (filters.sprint_id) sp.set("sp", filters.sprint_id);

  if (pagination.page > 1) sp.set("pg", String(pagination.page));
  if (pagination.sortBy !== "created_at") sp.set("sort", pagination.sortBy);
  if (pagination.sortOrder !== "desc") sp.set("o", pagination.sortOrder);

  if (groupBy) sp.set("grp", groupBy);

  return sp;
}

// ─── Inner component (needs Suspense for useSearchParams) ──

function GaweanPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const currentUserId = session?.profile?.id;
  const isAdmin = Boolean(session?.profile?.is_admin);

  // Baca state dari URL search params — rekomputasi hanya saat URL berubah.
  const filters = useMemo(
    () => parseFiltersFromParams(searchParams),
    [searchParams],
  );
  const pagination = useMemo(
    () => parsePaginationFromParams(searchParams),
    [searchParams],
  );
  const groupBy = searchParams.get("grp") || null;
  const grouping = groupBy !== null;

  // Collapsed group — local state (tidak perlu survive navigasi).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Helper: tulis state ke URL (replace, bukan push).
  const pushUrl = useCallback(
    (
      f: TicketFilters,
      p: PaginationParams,
      g: string | null,
    ) => {
      const sp = serializeToParams(f, p, g);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // ─── Event handlers ─────────────────────────────────

  const patchFilters = useCallback(
    (patch: Partial<TicketFilters>) => {
      pushUrl({ ...filters, ...patch }, { ...pagination, page: 1 }, groupBy);
    },
    [filters, pagination, groupBy, pushUrl],
  );

  const clearAllFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback(
    (page: number) => {
      pushUrl(filters, { ...pagination, page }, groupBy);
    },
    [filters, pagination, groupBy, pushUrl],
  );

  const handleSort = useCallback(
    (sortBy: string) => {
      const newOrder =
        pagination.sortBy === sortBy && pagination.sortOrder === "asc"
          ? "desc"
          : "asc";
      pushUrl(
        filters,
        { ...pagination, sortBy, sortOrder: newOrder, page: 1 },
        groupBy,
      );
    },
    [filters, pagination, groupBy, pushUrl],
  );

  const handleGroupByChange = useCallback(
    (key: string | null) => {
      pushUrl(filters, { ...pagination, page: 1 }, key);
      setCollapsed(new Set());
    },
    [filters, pagination, pushUrl],
  );

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Derived data ───────────────────────────────────

  const effectivePagination: PaginationParams = grouping
    ? { ...pagination, page: 1, pageSize: GROUP_FETCH_LIMIT }
    : pagination;

  const { tickets, loading, error, total, totalPages } = useTickets(
    {
      ...filters,
      assigned_to: filters.assign_to_me ? currentUserId : filters.assigned_to,
    },
    effectivePagination,
  );

  const groups = useMemo(
    () => (grouping ? groupTickets(tickets, groupBy) : []),
    [grouping, tickets, groupBy],
  );

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
        {isAdmin && (
          <Button
            variant="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => router.push("/gawean/new")}
          >
            Buat Tiket Baru
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
                          onClick={() => router.push("/gawean/new")}
                        >
                          Buat Tiket Pertama
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
                            onClick={() =>
                              router.push(`/gawean/${ticket.id}`)
                            }
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
                    onClick={() => router.push(`/gawean/${ticket.id}`)}
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

// ─── Export dengan Suspense wrapper (wajib untuk useSearchParams) ──

export default function GaweanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Memuat...</div>
      }
    >
      <GaweanPageInner />
    </Suspense>
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
        <span className="text-slate-700">{ticket.assignee?.name || "-"}</span>
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
