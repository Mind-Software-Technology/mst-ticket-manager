"use client";

// =====================================================
// useCheckinDetail Hook — single check-in detail
//
// Fetch satu check-in beserta items, tambah fokus baru ke
// check-in yang sama, dan hapus check-in.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Checkin } from "@/types";

interface NewFocusItem {
  ticket_id: string | null;
  description: string | null;
}

interface UseCheckinDetailResult {
  checkin: Checkin | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItems: (items: NewFocusItem[]) => Promise<void>;
  deleteCheckin: () => Promise<void>;
}

export function useCheckinDetail(checkinId: string): UseCheckinDetailResult {
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckin = useCallback(async () => {
    if (!checkinId || checkinId === "undefined") {
      setLoading(false);
      setError("Invalid check-in ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
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
        .eq("id", checkinId)
        .single();

      if (fetchErr) throw fetchErr;

      const result = data as Checkin;
      result.items = (result.items || []).sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      setCheckin(result);
    } catch (err) {
      console.error("[useCheckinDetail] fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch check-in");
      setCheckin(null);
    } finally {
      setLoading(false);
    }
  }, [checkinId]);

  useEffect(() => {
    void fetchCheckin();
  }, [fetchCheckin]);

  // Tambah fokus baru ke check-in yang SAMA (bukan bikin check-in baru).
  const addItems = async (items: NewFocusItem[]) => {
    if (!checkin || items.length === 0) return;
    const supabase = createClient();

    const baseOrder = checkin.items?.length || 0;
    const payload = items.map((it, idx) => ({
      checkin_id: checkin.id,
      ticket_id: it.ticket_id,
      description: it.description,
      sort_order: baseOrder + idx,
    }));

    const { error: insErr } = await supabase
      .from("checkin_items")
      .insert(payload);
    if (insErr) throw insErr;

    // Catat ke activity log tiket terkait (fokus check-in)
    const today = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    await Promise.all(
      items
        .filter((it) => it.ticket_id)
        .map((it) =>
          supabase.from("activity_logs").insert({
            ticket_id: it.ticket_id,
            user_id: checkin.employee_id,
            action_type: "checkin_ref",
            message: `Ticket ditambah ke fokus check-in tanggal ${today}`,
            created_at: new Date().toISOString(),
          }),
        ),
    );

    await fetchCheckin();
  };

  const deleteCheckin = async () => {
    if (!checkin) return;
    const supabase = createClient();
    // Hapus items dulu (jaga-jaga kalau tidak ada ON DELETE CASCADE)
    await supabase.from("checkin_items").delete().eq("checkin_id", checkin.id);
    const { error: delErr } = await supabase
      .from("checkins")
      .delete()
      .eq("id", checkin.id);
    if (delErr) throw delErr;
  };

  return {
    checkin,
    loading,
    error,
    refresh: fetchCheckin,
    addItems,
    deleteCheckin,
  };
}
