-- =====================================================
-- MIGRATION: Tag anggota di Check-In
--
-- 1. checkins.tagged_user_ids  → daftar user yang di-tag saat check-in
-- 2. mention_notifications     → bisa menunjuk ke check-in (bukan hanya tiket)
--
-- Jalankan di Supabase SQL editor. Idempotent.
-- =====================================================

ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS tagged_user_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE public.mention_notifications
  ALTER COLUMN ticket_id DROP NOT NULL;

ALTER TABLE public.mention_notifications
  ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES public.checkins(id) ON DELETE CASCADE;
