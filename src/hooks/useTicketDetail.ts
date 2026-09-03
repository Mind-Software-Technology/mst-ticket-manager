"use client";

// =====================================================
// useTicketDetail Hook — Single ticket CRUD
// Sprint 2 / Gawean Module
//
// Fetch single ticket dengan semua relasi, update fields.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Ticket } from "@/types";

interface UseTicketDetailResult {
  ticket: Ticket | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateTicket: (updates: Partial<Ticket>) => Promise<void>;
}

export function useTicketDetail(
  ticketId: string,
  currentUserId?: string | null,
): UseTicketDetailResult {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    // Validate ticketId
    if (!ticketId || ticketId === 'undefined' || ticketId === 'null') {
      console.warn("[useTicketDetail] invalid ticketId:", ticketId);
      setLoading(false);
      setError("Invalid ticket ID");
      setTicket(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("tickets")
        .select(
          `
          *,
          client:clients(id, name),
          product:products(id, name, prefix),
          project:projects(id, name),
          assignee:users!tickets_assigned_to_fkey(id, name, email, role),
          reporter:users!tickets_reported_to_fkey(id, name, email, role),
          sprint:sprints(id, name, start_date, end_date),
          labels:ticket_labels(label:labels(*)),
          attachments:ticket_attachments(*),
          additional_assignees:ticket_assignees(user:users(id, name, email, role))
        `,
        )
        .eq("id", ticketId)
        .single();

      if (fetchError) {
        // Enhanced error logging
        console.error("[useTicketDetail] Supabase error:", {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code,
          ticketId,
        });
        throw fetchError;
      }

      // Check if data is null (shouldn't happen after .single() but be safe)
      if (!data) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Flatten labels structure (ticket_labels → labels)
      const ticketData = data as any;
      if (ticketData.labels) {
        ticketData.labels = ticketData.labels.map((tl: any) => tl.label);
      }

      // Flatten & filter additional_assignees (ticket_assignees → users),
      // buang assignee utama (assigned_to) supaya tidak dobel tampil.
      if (ticketData.additional_assignees) {
        ticketData.additional_assignees = ticketData.additional_assignees
          .map((ta: any) => ta.user)
          .filter((u: any) => u && u.id !== ticketData.assigned_to);
      }

      setTicket(ticketData as Ticket);
    } catch (err: any) {
      // Enhanced error handling
      console.error("[useTicketDetail] fetch error:", err);
      console.error("[useTicketDetail] ticketId:", ticketId);
      
      let errorMessage = "Failed to fetch ticket";
      
      if (err?.code === "PGRST116") {
        errorMessage = "Ticket not found";
      } else if (err?.message?.includes("permission")) {
        errorMessage = "You don't have permission to view this ticket";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]); // ticketId is primitive, safe to use as dependency

  // Fetch on mount and when ticketId changes
  useEffect(() => {
    void fetchTicket();
  }, [fetchTicket]);

  // Update ticket with activity logging
  const updateTicket = async (updates: Partial<Ticket>) => {
    const supabase = createClient();
    if (!ticket) return;

    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("tickets")
        .update(payload)
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      // Log activity untuk setiap field yang berubah.
      // Field `state` dicatat sebagai state_change (tampil badge di timeline),
      // sisanya sebagai field_update. user_id diisi agar log tahu siapa yang ubah.
      const current = ticket as unknown as Record<string, unknown>;
      const logInserts = Object.entries(updates)
        .filter(([field, newValue]) => current[field] !== newValue)
        .map(([field, newValue]) => {
          const oldValue = current[field];
          return supabase.from("activity_logs").insert({
            ticket_id: ticket.id,
            user_id: currentUserId || null,
            action_type: field === "state" ? "state_change" : "field_update",
            field_changed: field,
            old_value: String(oldValue ?? ""),
            new_value: String(newValue ?? ""),
            created_at: new Date().toISOString(),
          });
        });
      await Promise.all(logInserts);

      // Refresh ticket data
      await fetchTicket();
    } catch (err) {
      console.error("[useTicketDetail] update error:", err);
      throw err;
    }
  };

  return {
    ticket,
    loading,
    error,
    refresh: fetchTicket,
    updateTicket,
  };
}
