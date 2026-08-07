"use client";

// =====================================================
// useClientHealth Hook — Client Health Score
//
// Hitung skor kesehatan tiap client dari tiket overdue.
// Tidak butuh tabel baru — dihitung langsung dari `tickets`.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { toISODate } from "@/lib/date-utils";

const CLOSED_STATES = ["done", "cancel"];

export type ClientHealthLevel = "green" | "yellow" | "red" | "unknown";

export interface ClientHealth {
  level: ClientHealthLevel;
  openCount: number;
  overdueCount: number;
  maxOverdueDays: number;
}

type HealthMap = Record<string, ClientHealth>;

function computeLevel(overdueCount: number, maxOverdueDays: number): ClientHealthLevel {
  if (overdueCount === 0) return "green";
  if (overdueCount >= 3 || maxOverdueDays > 14) return "red";
  return "yellow";
}

export function useClientHealth() {
  const [health, setHealth] = useState<HealthMap>({});
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("tickets")
        .select("client_id, state, due_date")
        .not("client_id", "is", null);

      if (error) throw error;

      const today = toISODate();
      const map: HealthMap = {};

      for (const t of (data || []) as Array<{
        client_id: string;
        state: string;
        due_date: string | null;
      }>) {
        const clientId = t.client_id;
        if (!map[clientId]) {
          map[clientId] = { level: "green", openCount: 0, overdueCount: 0, maxOverdueDays: 0 };
        }

        const isClosed = CLOSED_STATES.includes(t.state);
        if (isClosed) continue;

        map[clientId].openCount += 1;

        if (t.due_date && t.due_date < today) {
          const daysLate = Math.floor(
            (new Date(today).getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          map[clientId].overdueCount += 1;
          map[clientId].maxOverdueDays = Math.max(map[clientId].maxOverdueDays, daysLate);
        }
      }

      for (const clientId of Object.keys(map)) {
        map[clientId].level = computeLevel(map[clientId].overdueCount, map[clientId].maxOverdueDays);
      }

      setHealth(map);
    } catch (err) {
      console.error("[useClientHealth] fetch error:", err);
      setHealth({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  const getHealth = (clientId: string): ClientHealth =>
    health[clientId] || { level: "unknown", openCount: 0, overdueCount: 0, maxOverdueDays: 0 };

  return { health, getHealth, loading, refresh: fetchHealth };
}
