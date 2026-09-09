-- =====================================================================
-- RLS: Self-profile update — izinkan user update profil sendiri
-- =====================================================================
--
-- Konteks:
--   rls-authorization-phase2b.sql menambahkan RESTRICTIVE policy
--   `users_admin_update` yang membuat UPDATE di tabel public.users
--   hanya bisa dilakukan oleh admin (is_admin() = true).
--
--   Akibatnya, user non-admin tidak bisa edit nama mereka sendiri
--   walau ada permissive policy "Allow all actions on users".
--
-- Solusi:
--   Ganti RESTRICTIVE policy `users_admin_update` dengan versi baru
--   yang mengizinkan:
--     (a) Admin: bisa UPDATE semua baris (is_admin() = true)
--     (b) User biasa: bisa UPDATE HANYA baris milik sendiri
--                     (auth_user_id = auth.uid())
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

-- 1. Drop policy lama yang terlalu restrictive
DROP POLICY IF EXISTS users_admin_update ON public.users;

-- 2. Buat policy baru: admin ATAU pemilik baris (self-update)
--    RESTRICTIVE — harus lolos sebelum permissive policy dievaluasi.
CREATE POLICY users_self_or_admin_update ON public.users
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR auth_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR auth_user_id = auth.uid()
  );

-- ── Verifikasi ──
SELECT tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY permissive, cmd;
