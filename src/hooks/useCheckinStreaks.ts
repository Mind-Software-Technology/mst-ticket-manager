"use client";

// =====================================================
// useCheckinStreaks Hook — Check-In Streak (Senin-Jumat)
//
// Ambil riwayat check-in 90 hari terakhir untuk semua user,
// lalu hitung streak hari kerja berturut-turut tiap user.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import { computeWeekdayStreak } from "@/lib/streak";

type StreakMap = Record<string, number>;

// 90 hari cukup buat nutup streak terpanjang yang realistis (~9 minggu kerja)
// tanpa nge-fetch seluruh histori check-in.
const LOOKBACK_DAYS = 90;

export function useCheckinStreaks() {
  const [streaks, setStreaks] = useState<StreakMap>({});
  const [loading, setLoading] = useState(true);

  const fetchStreaks = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);

      const { data, error } = await supabase
        .from("checkins")
        .select("employee_id, created_at")
        .gte("created_at", since.toISOString());

      if (error) throw error;

      const datesByUser: Record<string, Set<string>> = {};
      for (const c of (data || []) as Array<{ employee_id: string; created_at: string }>) {
        if (!datesByUser[c.employee_id]) datesByUser[c.employee_id] = new Set();
        datesByUser[c.employee_id].add(toISODate(new Date(c.created_at)));
      }

      const map: StreakMap = {};
      for (const userId of Object.keys(datesByUser)) {
        map[userId] = computeWeekdayStreak(datesByUser[userId]);
      }

      setStreaks(map);
    } catch (err) {
      console.error("[useCheckinStreaks] fetch error:", err);
      setStreaks({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStreaks();
  }, [fetchStreaks]);

  const getStreak = (userId: string): number => streaks[userId] || 0;

  return { streaks, getStreak, loading, refresh: fetchStreaks };
}
