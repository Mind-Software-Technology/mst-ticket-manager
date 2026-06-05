// =====================================================
// Supabase Admin Client (Service Role)
//
// Client untuk API Route Handlers yang berjalan
// di server tanpa context cookies/session.
// Gunakan SUPABASE_SERVICE_ROLE_KEY untuk bypass RLS.
//
// PERHATIAN: Jangan expose client ini ke client-side!
// =====================================================

import { createClient } from "@supabase/supabase-js";

/**
 * Buat Supabase client dengan service role key.
 * Dipakai di API routes (cron, webhook) yang tidak punya
 * user session / cookies.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
