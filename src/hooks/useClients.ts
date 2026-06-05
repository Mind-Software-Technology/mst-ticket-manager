"use client";

// =====================================================
// useClients Hook — Client CRUD
// Sprint 3 / Config Management
//
// Fetch dan manage clients (master data).
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import type { Client } from "@/types";

interface UseClientsResult {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createClient: (data: Omit<Client, "id" | "created_at">) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      setClients((data as Client[]) || []);
    } catch (err: any) {
      console.error("[useClients] fetch error:", err);
      setError(err?.message || "Failed to fetch clients");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClients();
  }, [fetchClients]);

  const createClient = async (
    data: Omit<Client, "id" | "created_at">,
  ): Promise<Client> => {
    try {
      const supabase = createSupabaseClient();
      const { data: newClient, error: createError } = await supabase
        .from("clients")
        .insert({
          name: data.name,
          description: data.description,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchClients();
      return newClient as Client;
    } catch (err: any) {
      console.error("[useClients] create error:", err);
      throw err;
    }
  };

  const updateClient = async (
    id: string,
    data: Partial<Client>,
  ): Promise<void> => {
    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("clients")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchClients();
    } catch (err: any) {
      console.error("[useClients] update error:", err);
      throw err;
    }
  };

  const deleteClient = async (id: string): Promise<void> => {
    try {
      const supabase = createSupabaseClient();
      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchClients();
    } catch (err: any) {
      console.error("[useClients] delete error:", err);
      throw err;
    }
  };

  return {
    clients,
    loading,
    error,
    refresh: fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}
