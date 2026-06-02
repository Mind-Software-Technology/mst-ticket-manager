"use client";

// =====================================================
// useTickets — list/filter/paginate tickets
// Sprint 2 / Modul Gawean
//
// Fetch tickets dari Supabase dengan filter & pagination.
// Join: client, product, project, assignee, reporter.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import type {
  PaginationParams,
  Ticket,
  TicketFilters,
} from "@/types";

interface UseTicketsResult {
  tickets: Ticket[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const TICKET_SELECT = `
  *,
  client:clients(id, name),
  product:products(id, name, prefix),
  project:projects(id, name),
  assignee:users!tickets_assigned_to_fkey(id, name, email, division),
  reporter:users!tickets_reported_to_fkey(id, name, email, division)
`;

/**
 * Fetch & manage list tickets dengan filter + pagination.
 * Tidak auto-fetch — perlu memanggil refetch() atau toggle dependencies.
 */
export function useTickets(
  filters: TicketFilters,
  pagination: PaginationParams,
): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("tickets")
        .select(TICKET_SELECT, { count: "exact" });

      // Filters
      if (filters.search) {
        const term = filters.search.trim();
        if (term) {
          // Cari di subject ATAU ticket_id (mis. "ZB-20")
          query = query.or(
            `subject.ilike.%${term}%,ticket_id.ilike.%${term}%`,
          );
        }
      }
      if (filters.state?.length) {
        query = query.in("state", filters.state);
      }
      if (filters.priority?.length) {
        query = query.in("priority", filters.priority);
      }
      if (filters.category?.length) {
        query = query.in("category", filters.category);
      }
      if (filters.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }
      if (filters.client_id) {
        query = query.eq("client_id", filters.client_id);
      }
      if (filters.product_id) {
        query = query.eq("product_id", filters.product_id);
      }
      if (filters.project_id) {
        query = query.eq("project_id", filters.project_id);
      }
      if (filters.sprint_id) {
        query = query.eq("sprint_id", filters.sprint_id);
      }

      // Sort
      query = query.order(pagination.sortBy, {
        ascending: pagination.sortOrder === "asc",
        nullsFirst: false,
      });

      // Pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, count, error: queryError } = await query;

      if (queryError) {
        console.error("[useTickets] query error:", queryError);
        setError(queryError.message);
        setTickets([]);
        setTotal(0);
        return;
      }

      setTickets((data ?? []) as unknown as Ticket[]);
      setTotal(count ?? 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[useTickets] unexpected error:", err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.state,
    filters.priority,
    filters.category,
    filters.assigned_to,
    filters.client_id,
    filters.product_id,
    filters.project_id,
    filters.sprint_id,
    pagination.page,
    pagination.pageSize,
    pagination.sortBy,
    pagination.sortOrder,
  ]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { tickets, total, loading, error, refetch };
}
