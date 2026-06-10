-- =====================================================================
-- Migration: secure Telegram link code (analysis #3b)
--
-- Ganti kode link berbasis prefix UUID (mudah ditebak) dengan kode acak
-- sekali-pakai + expiry yang disimpan per user.
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_link_code       text,
  ADD COLUMN IF NOT EXISTS telegram_link_expires_at timestamptz;

-- Unique partial index: jamin kode unik + lookup cepat saat webhook
-- mencocokkan kode. NULL tidak diindeks (user yang belum punya kode).
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_link_code_key
  ON public.users (telegram_link_code)
  WHERE telegram_link_code IS NOT NULL;
