"use client";

// =====================================================
// useCheckins Hook — Daily Check-In CRUD
//
// Fetch & create check-ins beserta action items (Focus Today).
// Mendukung filter "Check In Today".
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Checkin } from "@/types";

interface NewCheckinItem {
  ticket_id: string | null;
  description: string | null;
  sort_order: number;
}

interface CreateCheckinInput {
  employee_id: string;
  division: string | null;
  yesterday_problem: string | null;
  items: NewCheckinItem[];
}

interface UseCheckinsResult {
  checkins: Checkin[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createCheckin: (input: CreateCheckinInput) => Promise<Checkin>;
}

/**
 * @param todayOnly - kalau true, hanya check-in yang dibuat hari ini.
 */
export function useCheckins(todayOnly = true): UseCheckinsResult {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("checkins")
        .select(
          `
          *,
          employee:users!checkins_employee_id_fkey(id, name, email, division),
          items:checkin_items(
            id, checkin_id, ticket_id, description, sort_order,
            ticket:tickets(id, ticket_id, subject, state)
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (todayOnly) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query = query
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Sort items by sort_order
      const result = ((data as Checkin[]) || []).map((c) => ({
        ...c,
        items: (c.items || []).sort((a, b) => a.sort_order - b.sort_order),
      }));

      setCheckins(result);
    } catch (err: any) {
      console.error("[useCheckins] fetch error:", err);
      setError(err?.message || "Failed to fetch check-ins");
      setCheckins([]);
    } finally {
      setLoading(false);
    }
  }, [todayOnly]);

  useEffect(() => {
    void fetchCheckins();
  }, [fetchCheckins]);

  const createCheckin = async (
    input: CreateCheckinInput,
  ): Promise<Checkin> => {
    const supabase = createClient();

    // 1. Insert check-in (auto-approved)
    const { data: checkin, error: createError } = await supabase
      .from("checkins")
      .insert({
        employee_id: input.employee_id,
        division: input.division,
        yesterday_problem: input.yesterday_problem,
        status: "approved",
        approved_by: input.employee_id,
      })
      .select()
      .single();

    if (createError) throw createError;

    // 2. Insert items
    if (input.items.length > 0) {
      const itemsPayload = input.items.map((it, idx) => ({
        checkin_id: checkin.id,
        ticket_id: it.ticket_id,
        description: it.description,
        sort_order: it.sort_order ?? idx,
      }));

      const { error: itemsError } = await supabase
        .from("checkin_items")
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // 3. Catat ke activity log tiket terkait (fokus check-in)
      const today = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      input.items
        .filter((it) => it.ticket_id)
        .forEach((it) => {
          void supabase.from("activity_logs").insert({
            ticket_id: it.ticket_id,
            user_id: input.employee_id,
            action_type: "checkin_ref",
            message: `Ticket ditambah ke fokus check-in tanggal ${today}`,
            created_at: new Date().toISOString(),
          });
        });
    }

    await fetchCheckins();
    return checkin as Checkin;
  };

  return {
    checkins,
    loading,
    error,
    refresh: fetchCheckins,
    createCheckin,
  };
}
