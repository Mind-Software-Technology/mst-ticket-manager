-- =====================================================================
-- Multi-Reporter saat Create Ticket
--
-- `tickets.reported_to` cuma bisa 1 orang. Fitur ini menambah
-- tabel junction `ticket_reporters` (many-to-many tickets <-> users)
-- supaya form Create Ticket bisa pilih lebih dari satu reporter.
--
-- `tickets.reported_to` TETAP dipakai apa adanya (tidak dihapus) sebagai
-- "reporter utama". Junction table hanya menyimpan reporter TAMBAHAN
-- (di luar reporter utama), ATAU BISA JUGA semua reporter termasuk utama
-- (kita simpan semua, reporter[0] = utama).
--
-- JALANKAN di Supabase SQL Editor. Idempotent.
-- =====================================================================

-- 1. Tabel junction
CREATE TABLE IF NOT EXISTS public.ticket_reporters (
  ticket_id  UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_reporters_ticket_id ON public.ticket_reporters(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reporters_user_id   ON public.ticket_reporters(user_id);

-- 2. RLS — samakan dengan pola tabel lain
ALTER TABLE public.ticket_reporters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on ticket_reporters" ON public.ticket_reporters;
CREATE POLICY "Allow all on ticket_reporters" ON public.ticket_reporters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Backfill: reporter utama tiket yang sudah ada masuk juga ke junction
--    supaya konsisten (tidak mengubah tickets.reported_to).
INSERT INTO public.ticket_reporters (ticket_id, user_id)
SELECT id, reported_to FROM public.tickets
WHERE reported_to IS NOT NULL
ON CONFLICT (ticket_id, user_id) DO NOTHING;
