"use client";

// =====================================================
// useSprints Hook — Sprint CRUD
// Sprint 3 / Config Management
//
// Fetch dan manage sprints (master data).
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Sprint } from "@/types";

interface UseSprintsResult {
  sprints: Sprint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createSprint: (data: Omit<Sprint, "id">) => Promise<Sprint>;
  updateSprint: (id: string, data: Partial<Sprint>) => Promise<void>;
  deleteSprint: (id: string) => Promise<void>;
}

export function useSprints(): UseSprintsResult {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSprints = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("sprints")
        .select("*")
        .order("start_date", { ascending: false });

      if (fetchError) throw fetchError;

      setSprints((data as Sprint[]) || []);
    } catch (err: any) {
      console.error("[useSprints] fetch error:", err);
      setError(err?.message || "Failed to fetch sprints");
      setSprints([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSprints();
  }, [fetchSprints]);

  const createSprint = async (data: Omit<Sprint, "id">): Promise<Sprint> => {
    try {
      const supabase = createClient();
      const { data: newSprint, error: createError } = await supabase
        .from("sprints")
        .insert({
          name: data.name,
          start_date: data.start_date,
          end_date: data.end_date,
          status: data.status || "Aktif",
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchSprints();
      return newSprint as Sprint;
    } catch (err: any) {
      console.error("[useSprints] create error:", err);
      throw err;
    }
  };

  const updateSprint = async (
    id: string,
    data: Partial<Sprint>,
  ): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("sprints")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchSprints();
    } catch (err: any) {
      console.error("[useSprints] update error:", err);
      throw err;
    }
  };

  const deleteSprint = async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("sprints")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchSprints();
    } catch (err: any) {
      console.error("[useSprints] delete error:", err);
      throw err;
    }
  };

  return {
    sprints,
    loading,
    error,
    refresh: fetchSprints,
    createSprint,
    updateSprint,
    deleteSprint,
  };
}
