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
import { PlusCircle, Filter } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useTickets } from "@/hooks/useTickets";
import { Badge, Button, SearchInput, Pagination, EmptyState } from "@/components/ui";
import { TICKET_STATES, TICKET_PRIORITIES, TICKET_CATEGORIES } from "@/lib/constants";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { TicketFilters, PaginationParams } from "@/types";

export default function GaweanPage() {
  const router = useRouter();
  const { session } = useSession();
  const currentUserId = session?.profile?.id;

  // Filters state
  const [filters, setFilters] = useState<TicketFilters>({
    search: "",
    state: [],
    priority: [],
    category: [],
    assign_to_me: false,
  });

  // Pagination state
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: "due_date",
    sortOrder: "asc",
  });

  // Show/hide filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tickets with current filters & pagination
  const { tickets, loading, error, total, totalPages } = useTickets(
    {
      ...filters,
      assigned_to: filters.assign_to_me ? currentUserId : filters.assigned_to,
    },
    pagination,
  );

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handleAssignToMe = () => {
    setFilters((prev) => ({
      ...prev,
      assign_to_me: !prev.assign_to_me,
      assigned_to: undefined,
    }));
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
        <Button
          variant="primary"
          icon={<PlusCircle className="w-4 h-4" />}
          onClick={() => router.push("/gawean/new")}
        >
          Buat Tiket Baru
        </Button>
      </div>

      {/* Toolbar: Search + Quick Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={filters.search || ""}
              onChange={handleSearch}
              placeholder="Cari tiket berdasarkan subject..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filters.assign_to_me ? "primary" : "secondary"}
              size="md"
              onClick={handleAssignToMe}
            >
              Assign To Me
            </Button>
            <Button
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {TICKET_STATES.map((state) => (
                    <label
                      key={state.value}
                      className="flex items-center text-sm cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.state?.includes(state.value)}
                        onChange={(e) => {
                          const newStates = e.target.checked
                            ? [...(filters.state || []), state.value]
                            : filters.state?.filter((s) => s !== state.value) || [];
                          setFilters((prev) => ({ ...prev, state: newStates }));
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Badge variant="state" state={state.value} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prioritas
                </label>
                <div className="space-y-1">
                  {TICKET_PRIORITIES.map((priority) => (
                    <label
                      key={priority.value}
                      className="flex items-center text-sm cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.priority?.includes(priority.value)}
                        onChange={(e) => {
                          const newPriorities = e.target.checked
                            ? [...(filters.priority || []), priority.value]
                            : filters.priority?.filter((p) => p !== priority.value) || [];
                          setFilters((prev) => ({ ...prev, priority: newPriorities }));
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <Badge variant="priority" priority={priority.value} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kategori
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {TICKET_CATEGORIES.map((category) => (
                    <label
                      key={category.value}
                      className="flex items-center text-sm cursor-pointer hover:bg-slate-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={filters.category?.includes(category.value)}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...(filters.category || []), category.value]
                            : filters.category?.filter((c) => c !== category.value) || [];
                          setFilters((prev) => ({ ...prev, category: newCategories }));
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {category.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    search: "",
                    state: [],
                    priority: [],
                    category: [],
                    assign_to_me: false,
                  });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

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
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Memuat tiket...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8}>
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
