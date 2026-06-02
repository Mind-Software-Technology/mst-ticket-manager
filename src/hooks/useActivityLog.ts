"use client";

// =====================================================
// useActivityLog — fetch + write activity logs per ticket
// Sprint 2 / Modul Gawean
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import type { ActivityActionType, ActivityLog } from "@/types";

interface UseActivityLogResult {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch activity logs untuk satu ticket, sorted DESC by created_at.
 * Join: user (avatar/name).
 */
export function useActivityLog(ticketId: string | null): UseActivityLogResult {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!ticketId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("activity_logs")
      .select(
        `
        *,
        user:users(id, name, email, division)
        `,
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("[useActivityLog] query error:", queryError);
      setError(queryError.message);
      setLogs([]);
    } else {
      setLogs((data ?? []) as unknown as ActivityLog[]);
    }
    setLoading(false);
  }, [ticketId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { logs, loading, error, refetch };
}

/**
 * Write satu log entry. Dipanggil dari hook lain setelah update tiket.
 * Tidak terikat ke React state — bisa dipakai dari mana saja.
 */
export async function writeActivityLog(input: {
  ticket_id: string;
  user_id: string | null;
  action_type: ActivityActionType;
  field_changed?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  message?: string | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("activity_logs").insert({
    ticket_id: input.ticket_id,
    user_id: input.user_id,
    action_type: input.action_type,
    field_changed: input.field_changed ?? null,
    old_value: input.old_value ?? null,
    new_value: input.new_value ?? null,
    message: input.message ?? null,
  });

  if (error) {
    console.error("[writeActivityLog] failed:", error);
    return { error: error.message };
  }
  return { error: null };
}
