// =====================================================
// Supabase Browser Client
//
// Client untuk digunakan di Client Components.
// Persist session di localStorage + auto-refresh token.
// Singleton pattern untuk ensure hanya 1 instance.
// =====================================================

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
