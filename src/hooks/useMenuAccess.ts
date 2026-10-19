"use client";

// =====================================================
// useMenuAccess — menu mana saja yang boleh dibuka user ini
//
// allowed = null  -> tidak ada pembatasan (belum diatur / tabel belum ada).
// =====================================================

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ALL_MENU_KEYS, type MenuKey } from "@/lib/menus";

interface Loaded {
  uid: string;
  allowed: MenuKey[] | null;
}

export function useMenuAccess(userId: string | undefined) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await createClient()
        .from("menu_access")
        .select("menus")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.warn("[useMenuAccess]", error.message);
      // Gagal baca / belum ada baris -> tanpa pembatasan (perilaku lama).
      const menus = !error && data ? (data.menus as string[]) : null;
      setLoaded({
        uid: userId,
        allowed: menus ? (menus.filter((m) => (ALL_MENU_KEYS as string[]).includes(m)) as MenuKey[]) : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const current = loaded && loaded.uid === userId ? loaded : null;
  return { allowed: current?.allowed ?? null, loading: !!userId && !current };
}
