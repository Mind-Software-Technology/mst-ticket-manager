-- =====================================================
-- MIGRATION: WhatsApp Check-In Reminder (Fonnte)
-- Date: 2026-08-07
--
-- Menambahkan kolom nomor WhatsApp ke tabel users, dipakai
-- oleh cron job checkin-reminder untuk mengirim notifikasi
-- via Fonnte ke user yang belum check-in.
--
-- Jalankan di Supabase SQL editor.
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

COMMENT ON COLUMN users.whatsapp_number IS
  'Nomor WhatsApp format Fonnte: 628xxxxxxxxxx (awalan 62, tanpa + atau 0 di depan)';
