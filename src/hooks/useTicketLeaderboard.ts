"use client";

// =====================================================
// useTicketLeaderboard Hook — statistik tiket per user
//
// Cara hitung:
// - Tiket selesai = state "done". Periode memakai done_date; kalau
//   done_date kosong (tiket lama / diubah di luar UI) pakai updated_at.
// - Tiket aktif (beban & molor) dihitung dari state saat ini.
// - Tiket dengan banyak assignee (assigned_to + ticket_assignees):
//   SETIAP assignee dapat kredit 1 tiket; jam kerja dibagi rata.
// - Semua bisa dipersempit per kategori tiket.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";
import type { TicketStatEntry } from "@/lib/leaderboard";
import type { TicketCategory, TicketPriority, TicketState } from "@/types";

export type LeaderboardPeriod = "month" | "30d" | "all";

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  month: "Bulan Ini",
  "30d": "30 Hari Terakhir",
  all: "Sepanjang Masa",
};

const OPEN_STATES: TicketState[] = [
  "todo",
  "need_fix",
  "on_progress",
  "code_review",
  "ready_for_qa",
  "in_qa",
  "ready_to_deploy",
];

// Supabase membatasi 1000 baris per request; ambil bertahap supaya "Sepanjang Masa" tidak terpotong.
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

interface TicketRow {
  id: string;
  assigned_to: string | null;
  extra_assignees: Array<{ user_id: string }> | null;
  state: TicketState;
  priority: TicketPriority;
  due_date: string | null;
  done_date: string | null;
  actual_manhours: number | null;
}

interface UserRow {
  id: string;
  name: string;
  division: string | null;
}

function periodStart(period: LeaderboardPeriod, now: Date): string | null {
  if (period === "month") return `${toISODate(now).slice(0, 7)}-01`;
  if (period === "30d") return toISODate(new Date(now.getTime() - 30 * 86400000));
  return null;
}

async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<TicketRow[]> {
  const rows: TicketRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await build(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const chunk = (data || []) as TicketRow[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return rows;
}

export function useTicketLeaderboard(period: LeaderboardPeriod, category: TicketCategory | "") {
  const [entries, setEntries] = useState<TicketStatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      const now = new Date();
      const todayStr = toISODate(now);
      const since = periodStart(period, now);
      const cols =
        "id, assigned_to, state, priority, due_date, done_date, actual_manhours, extra_assignees:ticket_assignees(user_id)";

      const [usersRes, doneRows, openRows] = await Promise.all([
        supabase.from("users").select("id, name, division").eq("is_active", true),
        fetchAll((from, to) => {
          let q = supabase.from("tickets").select(cols).eq("state", "done");
          if (since) {
            q = q.or(`done_date.gte.${since},and(done_date.is.null,updated_at.gte.${since})`);
          }
          if (category) q = q.eq("category", category);
          // id sebagai tie-breaker supaya paginasi stabil (tidak ada baris dobel/terlewat)
          return q.order("created_at", { ascending: false }).order("id").range(from, to);
        }),
        fetchAll((from, to) => {
          let q = supabase.from("tickets").select(cols).in("state", OPEN_STATES);
          if (category) q = q.eq("category", category);
          return q.order("created_at", { ascending: false }).order("id").range(from, to);
        }),
      ]);

      if (usersRes.error) throw usersRes.error;

      const stats = new Map<string, TicketStatEntry>();
      for (const u of (usersRes.data || []) as UserRow[]) {
        stats.set(u.id, {
          userId: u.id,
          name: u.name,
          division: u.division,
          done: 0,
          hours: 0,
          onTime: 0,
          urgent: 0,
          open: 0,
          overdue: 0,
        });
      }

      // Gabungkan assignee utama + tambahan jadi satu daftar unik per tiket.
      const assigneesOf = (t: TicketRow): string[] => {
        const ids = new Set<string>();
        if (t.assigned_to) ids.add(t.assigned_to);
        for (const e of t.extra_assignees ?? []) ids.add(e.user_id);
        return Array.from(ids);
      };

      for (const t of doneRows) {
        const ids = assigneesOf(t);
        if (ids.length === 0) continue;
        const hoursEach = (Number(t.actual_manhours) || 0) / ids.length;
        const doneOnTime = !!t.due_date && !!t.done_date && t.done_date <= t.due_date;
        for (const id of ids) {
          const s = stats.get(id);
          if (!s) continue;
          s.done += 1;
          s.hours += hoursEach;
          if (doneOnTime) s.onTime += 1;
          if (t.priority === "critical" || t.priority === "high") s.urgent += 1;
        }
      }

      for (const t of openRows) {
        const late = !!t.due_date && t.due_date < todayStr;
        for (const id of assigneesOf(t)) {
          const s = stats.get(id);
          if (!s) continue;
          s.open += 1;
          if (late) s.overdue += 1;
        }
      }

      setEntries(Array.from(stats.values()));
    } catch (err) {
      console.error("[useTicketLeaderboard] fetch error:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat papan peringkat tiket");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [period, category]);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  return { entries, loading, error, refresh: fetchBoard };
}
