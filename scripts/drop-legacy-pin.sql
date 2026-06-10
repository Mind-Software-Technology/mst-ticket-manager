-- =====================================================================
-- Drop kolom legacy `pin` dari users (Phase 2a)
--
-- `pin` adalah sisa login PIN lama; auth sudah pindah ke Supabase Auth.
-- Kolom ini ikut ter-download ke browser via select("*") -> eksposur
-- kredensial. Tidak dipakai untuk logika apa pun, jadi di-drop.
--
-- URUTAN AMAN (tanpa downtime fitur "Tambah User"):
--   1. STEP 1 (longgarkan NOT NULL) -> code lama & baru sama-sama jalan.
--   2. Deploy code yang sudah tidak menyentuh `pin`.
--   3. STEP 2 (drop kolom).
-- (Kalau "Tambah User" jarang dipakai, boleh langsung STEP 2 + deploy
--  bersamaan.)
-- =====================================================================

-- STEP 1 — aman dijalankan kapan saja:
ALTER TABLE public.users ALTER COLUMN pin DROP NOT NULL;

-- STEP 2 — jalankan SETELAH code baru (tanpa pin) ter-deploy:
ALTER TABLE public.users DROP COLUMN IF EXISTS pin;
