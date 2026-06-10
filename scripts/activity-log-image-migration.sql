-- =====================================================================
-- Activity Log: lampiran foto
--
-- Menambah kolom image_url di activity_logs + menyiapkan storage bucket
-- "ticket-attachments" (public) beserta policy upload/baca.
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

-- 1. Kolom URL foto pada activity_logs
ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Storage bucket (public supaya gampang ditampilkan via <img src>)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Policy storage.objects (idempotent)
--    Upload: hanya user login. Baca: publik (bucket sudah public).
DROP POLICY IF EXISTS "ticket_attachments_insert" ON storage.objects;
CREATE POLICY "ticket_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "ticket_attachments_select" ON storage.objects;
CREATE POLICY "ticket_attachments_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ticket-attachments');
