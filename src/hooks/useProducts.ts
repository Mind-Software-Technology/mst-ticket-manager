"use client";

// =====================================================
// useProducts Hook — Product CRUD
// Sprint 3 / Config Management
//
// Fetch dan manage products dengan client relation.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Product } from "@/types";

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProduct: (data: Omit<Product, "id" | "created_at" | "client">) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export function useProducts(clientId?: string): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("products")
        .select("*, client:clients(id, name)")
        .order("name", { ascending: true });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProducts((data as Product[]) || []);
    } catch (err: any) {
      console.error("[useProducts] fetch error:", err);
      setError(err?.message || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const createProduct = async (
    data: Omit<Product, "id" | "created_at" | "client">,
  ): Promise<Product> => {
    try {
      const supabase = createClient();
      const { data: newProduct, error: createError } = await supabase
        .from("products")
        .insert({
          name: data.name,
          prefix: data.prefix.toUpperCase(),
          client_id: data.client_id,
          is_active: data.is_active ?? true,
        })
        .select("*, client:clients(id, name)")
        .single();

      if (createError) throw createError;

      await fetchProducts();
      return newProduct as Product;
    } catch (err: any) {
      console.error("[useProducts] create error:", err);
      throw err;
    }
  };

  const updateProduct = async (
    id: string,
    data: Partial<Product>,
  ): Promise<void> => {
    try {
      const supabase = createClient();
      const updates: any = { ...data };
      if (updates.prefix) {
        updates.prefix = updates.prefix.toUpperCase();
      }

      const { error: updateError } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;

      await fetchProducts();
    } catch (err: any) {
      console.error("[useProducts] update error:", err);
      throw err;
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      await fetchProducts();
    } catch (err: any) {
      console.error("[useProducts] delete error:", err);
      throw err;
    }
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
