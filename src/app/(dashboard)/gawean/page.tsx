"use client";

// =====================================================
// Gawean List Page — Ticket Management
// Sprint 2 / Gawean Module
//
// Main ticket list dengan filter, search, pagination.
// Replace legacy /admin page untuk ticket operations.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useTickets } from "@/hooks/useTickets";
import { Badge, Button, Pagination, EmptyState } from "@/components/ui";
import { TicketFilterBar } from "@/components/TicketFilterBar";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { TicketFilters, PaginationParams } from "@/types";

export default function GaweanPage() {
  const router = useRouter();
  const { session } = useSession();
  const currentUserId = session?.profile?.id;
  const isAdmin = Boolean(session?.profile?.is_admin);

  // Filters state — default "Assign To Me" aktif saat halaman dibuka (gaya ERP)
  const [filters, setFilters] = useState<TicketFilters>({
    search: "",
    state: [],
    priority: [],
    category: [],
    assign_to_me: true,
  });

  // Pagination state — default: tiket terbaru (created_at) tampil paling atas
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "created_at",
    sortOrder: "desc",
  });

  // Fetch tickets with current filters & pagination
  const { tickets, loading, error, total, totalPages } = useTickets(
    {
      ...filters,
      assigned_to: filters.assign_to_me ? currentUserId : filters.assigned_to,
    },
    pagination,
  );

  // Merge sebagian filter + selalu reset ke halaman 1
  const patchFilters = (patch: Partial<TicketFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearAllFilters = () => {
    setFilters({ search: "", state: [], priority: [], category: [], assign_to_me: false });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSort = (sortBy: string) => {
    setPagination((prev) => ({
      ...prev,
      sortBy,
      sortOrder:
        prev.sortBy === sortBy && prev.sortOrder === "asc" ? "desc" : "asc",
    }));
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gawean (Tickets)</h1>
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

      {/* Toolbar: Search + Filters (gaya Odoo) */}
      <TicketFilterBar
        filters={filters}
        onChange={patchFilters}
        onClearAll={clearAllFilters}
      />

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
                <th className="p-4 font-medium">Manhours</th>
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
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/gawean/${ticket.id}`)}
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
                      <span className="text-slate-600">
                        {ticket.client?.name || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="priority" priority={ticket.priority} />
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">
                        {ticket.reporter?.name || "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-700">
                        {ticket.assignee?.name || "-"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">
                      {formatDate(ticket.due_date)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-slate-600">
                        {ticket.manhours_estimate || 0}h
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge variant="state" state={ticket.state} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
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
