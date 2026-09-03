-- =====================================================================
-- Fitur Ajukan Tiket (Ticket Requests)
--
-- Sebagian besar user tidak boleh membuat tiket langsung (lihat
-- `canCreateTicket` di gawean/new — hanya admin & gema@mst.id). Fitur
-- ini kasih jalan untuk user lain: mereka isi form "Ajukan Tiket",
-- lalu admin (siapa pun dengan is_admin=true, termasuk Nashwa) melihat
-- daftar permintaan pending di Dashboard Admin dan bisa langsung buat
-- tiketnya (data ke-prefill) atau menolaknya.
--
-- JALANKAN di Supabase SQL Editor. Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ticket_requests (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject        TEXT NOT NULL,
  description    TEXT,
  priority       VARCHAR(50) DEFAULT 'normal',
  category       VARCHAR(100),
  client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  reviewed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ticket_requests_status ON public.ticket_requests(status);
CREATE INDEX IF NOT EXISTS idx_ticket_requests_requested_by ON public.ticket_requests(requested_by);

ALTER TABLE public.ticket_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on ticket_requests" ON public.ticket_requests;
CREATE POLICY "Allow all on ticket_requests" ON public.ticket_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
