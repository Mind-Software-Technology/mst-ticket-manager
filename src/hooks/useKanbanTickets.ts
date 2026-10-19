"use client";

// =====================================================
// useKanbanTickets Hook — data papan Kanban
//
// Ambil tiket aktif + tiket Done/Cancel yang baru diubah (default
// 14 hari terakhir), refresh otomatis tiap 60 detik saat tab terlihat,
// dan sediakan moveTicket (optimistic update + rollback) yang mengikuti
// aturan yang sama dengan halaman detail: done_date otomatis + activity log.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import { TICKET_STATES } from "@/lib/constants";
import { isValidStateTransition } from "@/lib/ticket-utils";
import type { Ticket, TicketState } from "@/types";

type PersonRef = { id: string; name: string };
type KanbanRow = Omit<Ticket, "additional_assignees"> & {
  additional_assignees: Array<{ user: PersonRef | null }> | null;
};

const REFRESH_MS = 60_000;
const FETCH_LIMIT = 1000;
const ACTIVE_STATES = TICKET_STATES.map((s) => s.value).filter(
  (s) => s !== "done" && s !== "cancel",
);

export function useKanbanTickets(userId: string | undefined, recentDays: number, includeCancel: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Hindari fetch otomatis menimpa kartu yang sedang dipindah.
  const movingRef = useRef(0);

  const fetchTickets = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const supabase = createClient();
        const since = toISODate(new Date(Date.now() - recentDays * 86400000));
        const closed = includeCancel ? ["done", "cancel"] : ["done"];
        const orFilter =
          `state.in.(${ACTIVE_STATES.join(",")}),` +
          `and(state.in.(${closed.join(",")}),updated_at.gte.${since})`;

        const { data, error: fetchError } = await supabase
          .from("tickets")
          .select(
            `
            *,
            product:products(id, name, prefix),
            project:projects(id, name),
            assignee:users!tickets_assigned_to_fkey(id, name),
            additional_assignees:ticket_assignees(user:users(id, name))
          `,
          )
          .or(orFilter)
          .order("updated_at", { ascending: false })
          .range(0, FETCH_LIMIT - 1);

        if (fetchError) throw fetchError;
        if (movingRef.current > 0) return;

        const rows = ((data as unknown as KanbanRow[]) || []).map((row) => ({
          ...row,
          additional_assignees: (row.additional_assignees ?? [])
            .map((ta) => ta.user)
            .filter((u): u is PersonRef => !!u && u.id !== row.assigned_to),
        }));
        setTickets(rows as unknown as Ticket[]);
        setError(null);
        setUpdatedAt(new Date());
      } catch (err) {
        console.error("[useKanbanTickets] fetch error:", err);
        setError(err instanceof Error ? err.message : (err as { message?: string })?.message || "Gagal memuat tiket");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [recentDays, includeCancel],
  );

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void fetchTickets(true);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchTickets]);

  /** Pindah state tiket. Lempar error (dan rollback) kalau transisi ilegal / gagal simpan. */
  const moveTicket = useCallback(
    async (ticketId: string, newState: TicketState) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.state === newState) return;
      if (!isValidStateTransition(ticket.state, newState)) {
        throw new Error(`Tidak bisa pindah dari "${ticket.state}" ke "${newState}".`);
      }

      const previous = tickets;
      const today = toISODate(new Date());
      movingRef.current += 1;
      setTickets((list) =>
        list.map((t) =>
          t.id === ticketId
            ? { ...t, state: newState, done_date: newState === "done" ? today : t.done_date }
            : t,
        ),
      );

      try {
        const supabase = createClient();
        const updates: Partial<Ticket> = { state: newState };
        if (newState === "done") updates.done_date = today;

        const { error: updateError } = await supabase.from("tickets").update(updates).eq("id", ticketId);
        if (updateError) throw updateError;

        void supabase.from("activity_logs").insert({
          ticket_id: ticketId,
          user_id: userId || null,
          action_type: "state_change",
          field_changed: "state",
          old_value: ticket.state,
          new_value: newState,
        });
      } catch (err) {
        setTickets(previous);
        throw err;
      } finally {
        movingRef.current -= 1;
      }
    },
    [tickets, userId],
  );

  return { tickets, loading, error, updatedAt, refresh: () => fetchTickets(), moveTicket };
}
