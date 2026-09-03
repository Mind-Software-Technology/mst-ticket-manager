-- =====================================================================
-- Multi-Assignee saat Create Ticket
--
-- Sekarang `tickets.assigned_to` cuma bisa 1 orang. Fitur ini menambah
-- tabel junction `ticket_assignees` (many-to-many tickets <-> users)
-- supaya form Create Ticket bisa pilih lebih dari satu assignee.
--
-- `tickets.assigned_to` TETAP dipakai apa adanya (tidak dihapus) sebagai
-- "assignee utama" — dipakai oleh halaman lain (detail/edit, filter,
-- grouping, dashboard admin, reminder cron) yang masih single-assignee.
-- Assignee tambahan (lebih dari 1) hanya tersimpan di ticket_assignees.
--
-- JALANKAN di Supabase SQL Editor. Idempotent.
-- =====================================================================

-- 1. Tabel junction
CREATE TABLE IF NOT EXISTS public.ticket_assignees (
  ticket_id  UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket_id ON public.ticket_assignees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user_id   ON public.ticket_assignees(user_id);

-- 2. RLS — samakan dengan pola tabel lain (login-only, lihat
--    rls-restrict-to-authenticated.sql)
ALTER TABLE public.ticket_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on ticket_assignees" ON public.ticket_assignees;
CREATE POLICY "Allow all on ticket_assignees" ON public.ticket_assignees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Backfill: assignee utama tiket yang sudah ada masuk juga ke junction
--    supaya konsisten (tidak mengubah tickets.assigned_to).
INSERT INTO public.ticket_assignees (ticket_id, user_id)
SELECT id, assigned_to FROM public.tickets
WHERE assigned_to IS NOT NULL
ON CONFLICT (ticket_id, user_id) DO NOTHING;
