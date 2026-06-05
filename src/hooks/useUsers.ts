"use client";

// =====================================================
// useUsers Hook — User Management
// Sprint 3 / Config Management
//
// Fetch team members untuk dropdowns (assignee/reporter).
// CRUD operations untuk admin.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@/types";

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createUser: (data: Omit<User, "id" | "created_at">) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export function useUsers(activeOnly = false): UseUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase.from("users").select("*").order("name", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setUsers((data as User[]) || []);
    } catch (err: any) {
      console.error("[useUsers] fetch error:", err);
      setError(err?.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: Omit<User, "id" | "created_at">): Promise<User> => {
    try {
      const supabase = createClient();
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          name: data.name,
          email: data.email,
          role: data.role,
          division: data.division,
          pin: data.pin || "1234", // Default PIN
          is_active: data.is_active ?? true,
          is_admin: data.is_admin ?? false,
          auth_user_id: data.auth_user_id,
          telegram_chat_id: data.telegram_chat_id ?? null,
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchUsers();
      return newUser as User;
    } catch (err: any) {
      console.error("[useUsers] create error:", err);
      throw err;
    }
  };

  const updateUser = async (id: string, data: Partial<User>): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("users")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchUsers();
    } catch (err: any) {
      console.error("[useUsers] update error:", err);
      throw err;
    }
  };

  const deleteUser = async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchUsers();
    } catch (err: any) {
      console.error("[useUsers] delete error:", err);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    refresh: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
