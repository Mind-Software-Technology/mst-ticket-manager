"use client";

// =====================================================
// useProjects Hook — Project CRUD
// Sprint 3 / Config Management
//
// Fetch dan manage projects dengan product & client relations.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Project } from "@/types";

interface ProjectFilters {
  product_id?: string;
  client_id?: string;
}

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (data: Omit<Project, "id" | "created_at" | "product" | "client">) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export function useProjects(filters?: ProjectFilters): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("projects")
        .select(`
          *,
          product:products(id, name, prefix),
          client:clients(id, name)
        `)
        .order("name", { ascending: true });

      if (filters?.product_id) {
        query = query.eq("product_id", filters.product_id);
      }

      if (filters?.client_id) {
        query = query.eq("client_id", filters.client_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProjects((data as Project[]) || []);
    } catch (err: any) {
      console.error("[useProjects] fetch error:", err);
      setError(err?.message || "Failed to fetch projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [filters?.product_id, filters?.client_id]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const createProject = async (
    data: Omit<Project, "id" | "created_at" | "product" | "client">,
  ): Promise<Project> => {
    try {
      const supabase = createClient();
      const { data: newProject, error: createError } = await supabase
        .from("projects")
        .insert({
          name: data.name,
          product_id: data.product_id,
          client_id: data.client_id,
          is_active: data.is_active ?? true,
        })
        .select(`
          *,
          product:products(id, name, prefix),
          client:clients(id, name)
        `)
        .single();

      if (createError) throw createError;

      await fetchProjects();
      return newProject as Project;
    } catch (err: any) {
      console.error("[useProjects] create error:", err);
      throw err;
    }
  };

  const updateProject = async (
    id: string,
    data: Partial<Project>,
  ): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("projects")
        .update(data)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchProjects();
    } catch (err: any) {
      console.error("[useProjects] update error:", err);
      throw err;
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchProjects();
    } catch (err: any) {
      console.error("[useProjects] delete error:", err);
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
