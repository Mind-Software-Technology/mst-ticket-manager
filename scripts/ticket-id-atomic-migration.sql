-- =====================================================================
-- Migration: Atomic ticket_id / sequence allocation
-- Fixes analysis #2 — race condition pada penomoran tiket.
--
-- Masalah lama: generateTicketId membaca MAX(sequence)+1 di client, lalu
-- insert terpisah. Dua orang membuat tiket untuk product yang sama bisa
-- mendapat sequence yang sama -> ticket_id & sequence duplikat.
--
-- Solusi: counter table per-product yang di-increment secara atomik lewat
-- satu UPSERT (RETURNING) di dalam function SECURITY DEFINER. Karena counter
-- hanya pernah naik (tidak pernah dipakai ulang), dua pemanggilan paralel
-- dijamin mendapat angka berbeda. Unique constraint dipasang sebagai jaring
-- pengaman terakhir.
--
-- CARA PAKAI: jalankan seluruh file ini di Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. SAFETY CHECK (jalankan dulu, terpisah). Keduanya HARUS 0 baris.
--    Kalau ada baris, berarti sudah terlanjur ada duplikat -> bereskan
--    dulu sebelum menambah unique constraint di langkah 3.
-- ---------------------------------------------------------------------
-- SELECT ticket_id, count(*)
--   FROM public.tickets GROUP BY ticket_id HAVING count(*) > 1;
-- SELECT product_id, sequence, count(*)
--   FROM public.tickets WHERE product_id IS NOT NULL
--   GROUP BY product_id, sequence HAVING count(*) > 1;


-- ---------------------------------------------------------------------
-- 1. Counter table — satu baris per product, last_sequence monotonic.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_counters (
  product_id    uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  last_sequence integer NOT NULL DEFAULT 0
);

-- Aktifkan RLS tanpa policy apa pun: tabel ini hanya boleh diakses lewat
-- function SECURITY DEFINER di bawah (atau service_role). anon/authenticated
-- tidak bisa membaca/menulis langsung.
ALTER TABLE public.ticket_counters ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 2. Seed dari tiket yang sudah ada, supaya penomoran LANJUT (bukan ulang).
-- ---------------------------------------------------------------------
INSERT INTO public.ticket_counters (product_id, last_sequence)
SELECT product_id, COALESCE(MAX(sequence), 0)
  FROM public.tickets
 WHERE product_id IS NOT NULL
 GROUP BY product_id
ON CONFLICT (product_id)
DO UPDATE SET last_sequence =
  GREATEST(public.ticket_counters.last_sequence, EXCLUDED.last_sequence);


-- ---------------------------------------------------------------------
-- 3. Unique constraints (idempotent) — jaring pengaman terakhir.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_ticket_id_key'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_ticket_id_key UNIQUE (ticket_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_product_sequence_key'
  ) THEN
    ALTER TABLE public.tickets
      ADD CONSTRAINT tickets_product_sequence_key UNIQUE (product_id, sequence);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- 4. RPC: alokasikan sequence berikutnya secara atomik + format ticket_id.
--    Mengembalikan jsonb { ticketId, sequence }.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_ticket_id(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_seq    integer;
BEGIN
  SELECT upper(prefix) INTO v_prefix
    FROM public.products WHERE id = p_product_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Product % tidak ditemukan atau tidak punya prefix', p_product_id;
  END IF;

  INSERT INTO public.ticket_counters AS c (product_id, last_sequence)
  VALUES (p_product_id, 1)
  ON CONFLICT (product_id)
  DO UPDATE SET last_sequence = c.last_sequence + 1
  RETURNING c.last_sequence INTO v_seq;

  RETURN jsonb_build_object('ticketId', v_prefix || '-' || v_seq, 'sequence', v_seq);
END $$;


-- ---------------------------------------------------------------------
-- 5. Hak akses: hanya user login (authenticated) yang boleh memanggil.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.next_ticket_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.next_ticket_id(uuid) TO authenticated;
