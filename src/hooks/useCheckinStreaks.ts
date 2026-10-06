"use client";

// =====================================================
// useCheckinStreaks Hook — Check-In Streak (Configurable Days)
//
// Ambil riwayat check-in 90 hari terakhir untuk semua user,
// lalu hitung streak berdasarkan hari aktif yang dikonfigurasi
// admin (app_settings.checkin_active_days).
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import { computeWeekdayStreak, DEFAULT_ACTIVE_DAYS } from "@/lib/streak";

type StreakData = { streak: number; missedDate: string | null };
type StreakMap = Record<string, StreakData>;

// 90 hari cukup buat nutup streak terpanjang yang realistis (~9 minggu kerja)
// tanpa nge-fetch seluruh histori check-in.
const LOOKBACK_DAYS = 90;

/** Key di tabel app_settings untuk hari aktif check-in. */
export const CHECKIN_ACTIVE_DAYS_KEY = "checkin_active_days";

/**
 * Parse value dari app_settings → Set<number>.
 * Value disimpan sebagai JSON array of numbers, e.g. "[1,2,3,4,5]".
 * Fallback ke DEFAULT_ACTIVE_DAYS kalau parsing gagal.
 */
export function parseActiveDays(raw: string | null | undefined): ReadonlySet<number> {
  if (!raw) return DEFAULT_ACTIVE_DAYS;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr.every((n: unknown) => typeof n === "number")) {
      return new Set(arr as number[]);
    }
  } catch { /* ignore parse errors */ }
  return DEFAULT_ACTIVE_DAYS;
}

export function useCheckinStreaks() {
  const [streaks, setStreaks] = useState<StreakMap>({});
  const [activeDays, setActiveDays] = useState<ReadonlySet<number>>(DEFAULT_ACTIVE_DAYS);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();

      // Fetch active days setting and check-in history in parallel
      const [settingRes, checkinRes] = await Promise.all([
        supabase
          .from("app_settings")
          .select("value")
          .eq("key", CHECKIN_ACTIVE_DAYS_KEY)
          .maybeSingle(),
        supabase
          .from("checkins")
          .select("employee_id, created_at")
          .gte("created_at", new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString()),
      ]);

      const days = parseActiveDays(settingRes.data?.value);
      setActiveDays(days);

      if (checkinRes.error) throw checkinRes.error;

      const datesByUser: Record<string, Set<string>> = {};
      for (const c of (checkinRes.data || []) as Array<{ employee_id: string; created_at: string }>) {
        if (!datesByUser[c.employee_id]) datesByUser[c.employee_id] = new Set();
        datesByUser[c.employee_id].add(toISODate(new Date(c.created_at)));
      }

      const map: StreakMap = {};
      for (const userId of Object.keys(datesByUser)) {
        map[userId] = computeWeekdayStreak(datesByUser[userId], new Date(), days);
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

  const getStreakData = (userId: string): StreakData => streaks[userId] || { streak: 0, missedDate: null };
  const getStreak = (userId: string): number => getStreakData(userId).streak;

  return { streaks, activeDays, getStreak, getStreakData, loading, refresh: fetchStreaks };
}

