-- =====================================================================
-- Activity Log: banyak foto per post
--
-- Menambah kolom image_urls (array) di activity_logs. Kolom image_url lama
-- tetap dipakai sebagai foto pertama (kompatibel dengan data & kode lama).
--
-- JALANKAN di Supabase SQL Editor. Idempotent.
-- =====================================================================

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Backfill: log lama yang punya 1 foto → masuk ke array.
UPDATE public.activity_logs
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL
  AND cardinality(image_urls) = 0;
