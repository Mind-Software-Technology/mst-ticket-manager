"use client";

// =====================================================
// useActivityLogs Hook — Fetch activity timeline
// Sprint 2 / Activity Log
//
// Load activity logs untuk specific ticket, sorted by time.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { ActivityLog } from "@/types";

interface UseActivityLogsResult {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActivityLogs(ticketId: string): UseActivityLogsResult {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("activity_logs")
        .select(
          `
          *,
          user:users(id, name, email)
        `,
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setLogs((data as ActivityLog[]) || []);
    } catch (err: any) {
      console.error("[useActivityLogs] fetch error:", err);
      
      let errorMessage = "Failed to fetch activity logs";
      if (err?.code === "PGRST116") {
        errorMessage = "No activity logs found";
      } else if (err?.message?.includes("permission")) {
        errorMessage = "You don't have permission to view activity logs";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId]); // ticketId is primitive, safe to use as dependency

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refresh: fetchLogs,
  };
}
