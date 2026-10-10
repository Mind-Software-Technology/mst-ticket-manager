-- =====================================================================
-- Activity Log: lampiran file (PDF, Word, Excel, video, dll.)
--
-- Menambah kolom `files` (jsonb array) di activity_logs. Tiap elemen:
--   { "name": "laporan.pdf", "url": "...", "type": "application/pdf", "size": 12345 }
-- File disimpan di bucket "ticket-attachments" yang sudah ada
-- (lihat activity-log-image-migration.sql).
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb;
