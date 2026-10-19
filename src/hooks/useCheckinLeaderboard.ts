"use client";

// =====================================================
// useCheckinLeaderboard Hook — data papan peringkat check-in
//
// Ambil semua user aktif + riwayat check-in 90 hari terakhir,
// lalu hitung streak, hari check-in bulan ini, dan rata-rata jam
// check-in (30 hari terakhir) per user.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import {
  computeWeekdayStreak,
  DEFAULT_ACTIVE_DAYS,
  CHECKIN_ACTIVE_DAYS_KEY,
  parseActiveDays,
} from "@/lib/streak";
import { MIN_EARLY_SAMPLES, type LeaderboardEntry } from "@/lib/leaderboard";

const LOOKBACK_DAYS = 90;
const EARLY_WINDOW_DAYS = 30;

interface CheckinRow {
  employee_id: string;
  created_at: string;
}

interface UserRow {
  id: string;
  name: string;
  division: string | null;
}

export function useCheckinLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      const now = new Date();

      const [settingRes, usersRes, checkinRes] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", CHECKIN_ACTIVE_DAYS_KEY).maybeSingle(),
        supabase.from("users").select("id, name, division").eq("is_active", true),
        supabase
          .from("checkins")
          .select("employee_id, created_at")
          .gte("created_at", new Date(now.getTime() - LOOKBACK_DAYS * 86400000).toISOString()),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (checkinRes.error) throw checkinRes.error;

      const { days, since } = parseActiveDays(settingRes.data?.value);
      const activeDays = days ?? DEFAULT_ACTIVE_DAYS;

      const todayStr = toISODate(now);
      const monthPrefix = todayStr.slice(0, 7);
      const earlyCutoff = now.getTime() - EARLY_WINDOW_DAYS * 86400000;

      const datesByUser = new Map<string, Set<string>>();
      const minutesByUser = new Map<string, number[]>();
      for (const c of (checkinRes.data || []) as CheckinRow[]) {
        const d = new Date(c.created_at);
        const set = datesByUser.get(c.employee_id) ?? new Set<string>();
        set.add(toISODate(d));
        datesByUser.set(c.employee_id, set);

        if (d.getTime() >= earlyCutoff) {
          const mins = minutesByUser.get(c.employee_id) ?? [];
          mins.push(d.getHours() * 60 + d.getMinutes());
          minutesByUser.set(c.employee_id, mins);
        }
      }

      const result: LeaderboardEntry[] = ((usersRes.data || []) as UserRow[]).map((u) => {
        const dates = datesByUser.get(u.id) ?? new Set<string>();
        const mins = minutesByUser.get(u.id) ?? [];
        return {
          userId: u.id,
          name: u.name,
          division: u.division,
          streak: computeWeekdayStreak(dates, now, activeDays, since).streak,
          monthDays: Array.from(dates).filter((d) => d.startsWith(monthPrefix)).length,
          avgMinute:
            mins.length >= MIN_EARLY_SAMPLES ? mins.reduce((a, b) => a + b, 0) / mins.length : null,
          checkedInToday: dates.has(todayStr),
        };
      });

      setEntries(result);
    } catch (err) {
      console.error("[useCheckinLeaderboard] fetch error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat papan peringkat");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  return { entries, loading, error, refresh: fetchBoard };
}
