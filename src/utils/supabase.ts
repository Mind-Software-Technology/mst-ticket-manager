// =====================================================
// Supabase Browser Client
//
// Single shared client untuk seluruh app (App Router, client components).
// Persist session di localStorage + auto-refresh token.
// =====================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper: cek apakah env Supabase sudah dikonfigurasi.
 * Berguna untuk fallback ke "Mode Demo" di halaman tertentu.
 */
export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  (Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
