-- =====================================================================
-- One-time cleanup: beri `sequence` unik pada tiket yang bentrok,
-- sebelum menjalankan ticket-id-atomic-migration.sql.
--
-- Temuan di production (10 Jun 2026):
--   * 11 tiket pada product aa4127ba-... semuanya punya sequence = 0
--     -> melanggar UNIQUE (product_id, sequence).
--   * ticket_id SEMUA unik & bermakna (SPT1-DEV1, SPT1-BIZ1, ...).
--
-- Maka: JANGAN sentuh ticket_id. Cukup beri sequence unik pada baris yang
-- bentrok. Baris tertua (created_at) per grup dibiarkan; sisanya diberi
-- sequence baru di ATAS nomor tertinggi product tsb. Penomoran display
-- (ticket_id) tetap apa adanya.
--
-- JALANKAN BERURUTAN. Review hasil bagian 1 sebelum menjalankan bagian 2.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PREVIEW (read-only) — baris mana yang akan diberi sequence baru,
--    dan jadi berapa. ticket_id ditampilkan supaya jelas TIDAK berubah.
-- ---------------------------------------------------------------------
WITH ranked AS (
  SELECT id, product_id, sequence,
         row_number() OVER (PARTITION BY product_id, sequence
                            ORDER BY created_at, id) AS rn
    FROM public.tickets
   WHERE product_id IS NOT NULL
),
dups AS (
  SELECT id, product_id FROM ranked WHERE rn > 1
),
maxseq AS (
  SELECT product_id, COALESCE(MAX(sequence), 0) AS m
    FROM public.tickets
   WHERE product_id IS NOT NULL
   GROUP BY product_id
),
newnums AS (
  SELECT d.id,
         m.m + row_number() OVER (PARTITION BY d.product_id ORDER BY d.id) AS new_seq
    FROM dups d
    JOIN maxseq m USING (product_id)
)
SELECT t.ticket_id,                 -- TIDAK berubah
       t.sequence AS old_seq,
       n.new_seq,
       t.subject
  FROM newnums n
  JOIN public.tickets t ON t.id = n.id
 ORDER BY n.new_seq;


-- ---------------------------------------------------------------------
-- 2. FIX — jalankan setelah review bagian 1. Transaksional.
--    Hanya kolom `sequence` yang diubah. ticket_id dibiarkan.
-- ---------------------------------------------------------------------
BEGIN;

WITH ranked AS (
  SELECT id, product_id, sequence,
         row_number() OVER (PARTITION BY product_id, sequence
                            ORDER BY created_at, id) AS rn
    FROM public.tickets
   WHERE product_id IS NOT NULL
),
dups AS (
  SELECT id, product_id FROM ranked WHERE rn > 1
),
maxseq AS (
  SELECT product_id, COALESCE(MAX(sequence), 0) AS m
    FROM public.tickets
   WHERE product_id IS NOT NULL
   GROUP BY product_id
),
newnums AS (
  SELECT d.id,
         m.m + row_number() OVER (PARTITION BY d.product_id ORDER BY d.id) AS new_seq
    FROM dups d
    JOIN maxseq m USING (product_id)
)
UPDATE public.tickets t
   SET sequence   = n.new_seq,
       updated_at = now()
  FROM newnums n
 WHERE t.id = n.id;

-- Verifikasi: HARUS 0 baris sebelum COMMIT.
SELECT product_id, sequence, count(*) FROM public.tickets
 WHERE product_id IS NOT NULL
 GROUP BY product_id, sequence HAVING count(*) > 1;

-- Kalau 0 baris -> COMMIT. Kalau masih ada -> ganti ke ROLLBACK.
COMMIT;
-- ROLLBACK;
