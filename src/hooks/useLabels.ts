"use client";

// =====================================================
// useLabels Hook — Label CRUD
// Config Management
//
// Fetch dan manage labels (master data untuk tiket).
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Label } from "@/types";

interface UseLabelsResult {
  labels: Label[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createLabel: (data: Omit<Label, "id">) => Promise<Label>;
  updateLabel: (id: string, data: Partial<Label>) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
}

export function useLabels(): UseLabelsResult {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("labels")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      setLabels((data as Label[]) || []);
    } catch (err: any) {
      console.error("[useLabels] fetch error:", err);
      setError(err?.message || "Failed to fetch labels");
      setLabels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLabels();
  }, [fetchLabels]);

  const createLabel = async (data: Omit<Label, "id">): Promise<Label> => {
    try {
      const supabase = createClient();
      const { data: newLabel, error: createError } = await supabase
        .from("labels")
        .insert({
          name: data.name,
          color: data.color || "#6366f1",
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchLabels();
      return newLabel as Label;
    } catch (err: any) {
      console.error("[useLabels] create error:", err);
      throw err;
    }
  };

  const updateLabel = async (
    id: string,
    data: Partial<Label>,
  ): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("labels")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchLabels();
    } catch (err: any) {
      console.error("[useLabels] update error:", err);
      throw err;
    }
  };

  const deleteLabel = async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("labels")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchLabels();
    } catch (err: any) {
      console.error("[useLabels] delete error:", err);
      throw err;
    }
  };

  return {
    labels,
    loading,
    error,
    refresh: fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
  };
}
