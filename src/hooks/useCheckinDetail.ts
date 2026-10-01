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
  mentioned_user_ids?: string[];
}

interface UseCheckinDetailResult {
  checkin: Checkin | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItems: (items: NewFocusItem[]) => Promise<void>;
  deleteCheckin: () => Promise<void>;
  updateItemDescription: (
    itemId: string,
    description: string,
    mentionedIds?: string[],
  ) => Promise<void>;
  updateYesterdayProblem: (value: string) => Promise<void>;
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

  // Kirim notifikasi @mention (dengan kutipan + tautan tiket) & catat user di
  // checkins.tagged_user_ids. Gagal di sini tidak membatalkan simpan.
  const notifyMentions = async (
    entries: { ticket_id: string | null; description: string | null; ids: string[] }[],
  ) => {
    if (!checkin) return;
    const rows = entries.flatMap((e) =>
      Array.from(new Set(e.ids))
        .filter((uid) => uid !== checkin.employee_id)
        .map((uid) => ({
          ticket_id: e.ticket_id,
          checkin_id: checkin.id,
          mentioned_user_id: uid,
          mentioned_by: checkin.employee_id,
          excerpt: e.description,
        })),
    );
    if (rows.length === 0) return;
    const supabase = createClient();
    const tagged = Array.from(
      new Set([...(checkin.tagged_user_ids ?? []), ...rows.map((r) => r.mentioned_user_id)]),
    );
    const { error: tagErr } = await supabase
      .from("checkins")
      .update({ tagged_user_ids: tagged })
      .eq("id", checkin.id);
    if (tagErr) console.error("[useCheckinDetail] tag update failed:", tagErr);
    const { error: notifErr } = await supabase.from("mention_notifications").insert(rows);
    if (notifErr) console.error("[useCheckinDetail] notify failed:", notifErr);
  };

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

    await notifyMentions(
      items.map((it) => ({
        ticket_id: it.ticket_id,
        description: it.description,
        ids: it.mentioned_user_ids ?? [],
      })),
    );
    await fetchCheckin();
  };

  // Edit teks fokus (item) yang sudah tersimpan.
  const updateItemDescription = async (
    itemId: string,
    description: string,
    mentionedIds: string[] = [],
  ) => {
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("checkin_items")
      .update({ description: description.trim() || null })
      .eq("id", itemId);
    if (updErr) throw updErr;
    await notifyMentions([
      {
        ticket_id: checkin?.items?.find((i) => i.id === itemId)?.ticket_id ?? null,
        description: description.trim() || null,
        ids: mentionedIds,
      },
    ]);
    await fetchCheckin();
  };

  // Edit teks "Yesterday Problem".
  const updateYesterdayProblem = async (value: string) => {
    if (!checkin) return;
    const supabase = createClient();
    const { error: updErr } = await supabase
      .from("checkins")
      .update({ yesterday_problem: value.trim() || null })
      .eq("id", checkin.id);
    if (updErr) throw updErr;
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
    updateItemDescription,
    updateYesterdayProblem,
  };
}
