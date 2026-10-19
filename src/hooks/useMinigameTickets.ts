"use client";

// =====================================================
// useMinigameTickets Hook — bahan permainan dari tiket asli
//
// Ambil sekali (tanpa polling supaya permainan tidak berubah di
// tengah jalan): 400 tiket terakhir diubah + nama user aktif.
// =====================================================

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { GameTicket } from "@/lib/minigame";

const FETCH_LIMIT = 400;

type Maybe<T> = T | T[] | null;
interface Row {
  id: string;
  ticket_id: string;
  subject: string;
  state: GameTicket["state"];
  priority: GameTicket["priority"];
  due_date: string | null;
  category: string;
  product: Maybe<{ name: string }>;
  assignee: Maybe<{ id: string; name: string }>;
}

const one = <T,>(v: Maybe<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export function useMinigameTickets() {
  const [tickets, setTickets] = useState<GameTicket[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [ticketRes, userRes] = await Promise.all([
          supabase
            .from("tickets")
            .select(
              "id, ticket_id, subject, state, priority, due_date, category, product:products(name), assignee:users!tickets_assigned_to_fkey(id, name)",
            )
            .neq("state", "cancel")
            .order("updated_at", { ascending: false })
            .range(0, FETCH_LIMIT - 1),
          supabase.from("users").select("name").eq("is_active", true),
        ]);
        if (ticketRes.error) throw ticketRes.error;
        if (userRes.error) throw userRes.error;
        if (cancelled) return;

        setTickets(
          ((ticketRes.data || []) as unknown as Row[]).map((r) => {
            const assignee = one(r.assignee);
            return {
              id: r.id,
              ticket_id: r.ticket_id,
              subject: r.subject,
              state: r.state,
              priority: r.priority,
              due_date: r.due_date,
              category: r.category,
              productName: one(r.product)?.name ?? null,
              assigneeId: assignee?.id ?? null,
              assigneeName: assignee?.name ?? null,
            };
          }),
        );
        setNames(((userRes.data || []) as Array<{ name: string }>).map((u) => u.name));
      } catch (err) {
        console.error("[useMinigameTickets] fetch error:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat tiket untuk minigame");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tickets, names, loading, error };
}
