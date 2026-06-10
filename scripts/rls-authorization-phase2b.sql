-- =====================================================================
-- RLS Lockdown — Phase 2b: authorization (admin vs member)
-- Keputusan: 1A (users: INSERT/UPDATE/DELETE admin-only)
--            2A (master data: DELETE admin-only)
--
-- Pakai RESTRICTIVE policy yang DITAMBAHKAN di atas policy permissive
-- "Allow all ..." dari Phase 1. Restrictive = AND, jadi:
--   * SELECT/INSERT/UPDATE umum tetap mengikuti permissive (authenticated)
--   * command yang diberi restrictive WAJIB juga lolos is_admin()
--
-- PRA-SYARAT (cek dulu!): minimal 1 user admin punya auth_user_id ter-link,
-- kalau tidak, tidak ada yang bisa mengelola users dari app (masih bisa via
-- service role / SQL editor).
--   SELECT id, name, is_admin, auth_user_id FROM public.users WHERE is_admin;
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

-- ── Helper: apakah user yang login adalah admin? ─────
-- SECURITY DEFINER (owner postgres) -> SELECT internalnya bypass RLS,
-- jadi TIDAK rekursif walau dipanggil dari policy tabel users.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.is_admin FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── users: INSERT/UPDATE/DELETE admin-only (SELECT tetap semua) ──
CREATE POLICY users_admin_insert ON public.users
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY users_admin_update ON public.users
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY users_admin_delete ON public.users
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── master data: DELETE admin-only (buat/edit tetap semua) ──
CREATE POLICY clients_admin_delete  ON public.clients  AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY products_admin_delete ON public.products AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY projects_admin_delete ON public.projects AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY sprints_admin_delete  ON public.sprints  AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY labels_admin_delete   ON public.labels   AS RESTRICTIVE FOR DELETE TO authenticated USING (public.is_admin());

-- ── activity_logs: insert-only (jaga integritas audit trail) ──
CREATE POLICY activity_logs_no_update ON public.activity_logs AS RESTRICTIVE FOR UPDATE TO authenticated USING (false);
CREATE POLICY activity_logs_no_delete ON public.activity_logs AS RESTRICTIVE FOR DELETE TO authenticated USING (false);

-- ── Verifikasi (opsional) ──
SELECT tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
  WHERE schemaname='public' AND permissive='RESTRICTIVE'
  ORDER BY tablename, cmd;
