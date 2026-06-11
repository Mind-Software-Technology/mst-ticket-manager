-- =====================================================================
-- Fitur Attachment Tiket (image / video)
--
-- Tabel `ticket_attachments` & bucket `ticket-attachments` SUDAH ada
-- (dibuat di activity-log-image-migration.sql). Script ini hanya:
--   1. Menaikkan batas ukuran file bucket → 50MB (cukup untuk video).
--   2. Menambah policy DELETE storage (khusus admin) supaya admin bisa
--      menghapus lampiran dari halaman detail tiket.
--
-- INSERT (upload) & SELECT (download/public) sudah ada policy-nya.
--
-- JALANKAN di Supabase SQL Editor (prod `main`). Idempotent.
-- =====================================================================

-- 1. Batas ukuran file bucket = 50MB (mendukung video)
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50 * 1024 * 1024
WHERE id = 'ticket-attachments';

-- 2. Policy DELETE storage.objects — hanya admin
--    (frontend juga sudah membatasi tombol hapus ke admin)
DROP POLICY IF EXISTS "ticket_attachments_delete" ON storage.objects;
CREATE POLICY "ticket_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-attachments' AND public.is_admin());
