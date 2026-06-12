"use client";

// =====================================================
// useTickets Hook — Ticket CRUD & filtering
// Sprint 2 / Gawean Module
//
// Custom hook untuk fetch, filter, dan mutate tickets.
// Support pagination, sorting, full-text search.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import type { Ticket, TicketFilters, PaginationParams } from "@/types";

interface UseTicketsResult {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  refresh: () => Promise<void>;
  updateTicketState: (ticketId: string, newState: string) => Promise<void>;
}

export function useTickets(
  filters: TicketFilters,
  pagination: PaginationParams,
): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Free-text "contains" pada nama user → resolusi ke daftar ID.
      // (Gaya Odoo "Assignee contains fadil".)
      let assigneeIds: string[] | null = null;
      if (filters.assignee_name?.trim()) {
        const { data: matched, error: lookupErr } = await supabase
          .from("users")
          .select("id")
          .ilike("name", `%${filters.assignee_name.trim()}%`);
        if (lookupErr) throw lookupErr;
        assigneeIds = (matched ?? []).map((u) => u.id as string);
        if (assigneeIds.length === 0) {
          setTickets([]);
          setTotal(0);
          return; // finally tetap mematikan loading
        }
      }

      let reporterIds: string[] | null = null;
      if (filters.reporter_name?.trim()) {
        const { data: matched, error: lookupErr } = await supabase
          .from("users")
          .select("id")
          .ilike("name", `%${filters.reporter_name.trim()}%`);
        if (lookupErr) throw lookupErr;
        reporterIds = (matched ?? []).map((u) => u.id as string);
        if (reporterIds.length === 0) {
          setTickets([]);
          setTotal(0);
          return;
        }
      }

      // Start query with count
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name),
          product:products(id, name, prefix),
          project:projects(id, name),
          assignee:users!tickets_assigned_to_fkey(id, name, email, role),
          reporter:users!tickets_reported_to_fkey(id, name, email, role),
          sprint:sprints(id, name, start_date, end_date)
        `,
          { count: "exact" },
        );

      // Apply filters
      if (filters.search) {
        query = query.ilike("subject", `%${filters.search}%`);
      }

      if (filters.state && filters.state.length > 0) {
        query = query.in("state", filters.state);
      }

      if (filters.priority && filters.priority.length > 0) {
        query = query.in("priority", filters.priority);
      }

      if (filters.category && filters.category.length > 0) {
        query = query.in("category", filters.category);
      }

      if (filters.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      if (assigneeIds) {
        query = query.in("assigned_to", assigneeIds);
      }

      if (reporterIds) {
        query = query.in("reported_to", reporterIds);
      }

      // Rentang tanggal (due/done = kolom date, created_at = timestamp)
      if (filters.due_date_from) query = query.gte("due_date", filters.due_date_from);
      if (filters.due_date_to) query = query.lte("due_date", filters.due_date_to);
      if (filters.done_date_from) query = query.gte("done_date", filters.done_date_from);
      if (filters.done_date_to) query = query.lte("done_date", filters.done_date_to);
      if (filters.created_from) query = query.gte("created_at", filters.created_from);
      if (filters.created_to) {
        // created_at bertipe timestamp → sertakan sampai akhir hari.
        query = query.lte("created_at", `${filters.created_to}T23:59:59.999`);
      }

      // Quick flags
      if (filters.not_closed) {
        query = query.not("state", "in", "(done,cancel)");
      }
      if (filters.overdue) {
        query = query
          .lt("due_date", toISODate())
          .not("state", "in", "(done,cancel)");
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

      // Pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      // Sorting
      query = query.order(pagination.sortBy, {
        ascending: pagination.sortOrder === "asc",
      });

      const { data, count, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setTickets((data as Ticket[]) || []);
      setTotal(count || 0);
    } catch (err: any) {
      console.error("[useTickets] fetch error:", err);
      
      let errorMessage = "Failed to fetch tickets";
      if (err?.code === "PGRST116") {
        errorMessage = "No tickets found";
      } else if (err?.message?.includes("permission")) {
        errorMessage = "You don't have permission to view tickets";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setTickets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    // Serialize dependencies to prevent infinite loop
    filters.search,
    filters.state?.join(","),
    filters.priority?.join(","),
    filters.category?.join(","),
    filters.assigned_to,
    filters.assignee_name,
    filters.reporter_name,
    filters.due_date_from,
    filters.due_date_to,
    filters.done_date_from,
    filters.done_date_to,
    filters.created_from,
    filters.created_to,
    filters.not_closed,
    filters.overdue,
    filters.client_id,
    filters.product_id,
    filters.project_id,
    filters.sprint_id,
    pagination.page,
    pagination.pageSize,
    pagination.sortBy,
    pagination.sortOrder,
  ]);

  // Fetch on mount and when filters/pagination change
  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  // Update ticket state with activity log
  const updateTicketState = async (ticketId: string, newState: string) => {
    const supabase = createClient();
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    try {
      // Update ticket
      const updates: Partial<Ticket> = {
        state: newState as Ticket["state"],
        updated_at: new Date().toISOString(),
      };

      // Auto-set done_date when moving to done
      if (newState === "done") {
        updates.done_date = new Date().toISOString().split("T")[0];
      }

      const { error: updateError } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Log activity (fire and forget - don't block UI)
      void supabase.from("activity_logs").insert({
        ticket_id: ticketId,
        action_type: "state_change",
        field_changed: "state",
        old_value: ticket.state,
        new_value: newState,
        created_at: new Date().toISOString(),
      });

      // Refresh list
      await fetchTickets();
    } catch (err) {
      console.error("[useTickets] update state error:", err);
      throw err;
    }
  };

  const totalPages = Math.ceil(total / pagination.pageSize);

  return {
    tickets,
    loading,
    error,
    total,
    totalPages,
    refresh: fetchTickets,
    updateTicketState,
  };
}
