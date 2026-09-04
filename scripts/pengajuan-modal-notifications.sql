-- =====================================================
-- Migration: Pengajuan Modal Notifications
--
-- Tabel untuk notifikasi pengajuan modal baru yang dikirim
-- via webhook dari web mst-keuangan (mst-pengajuan-modal.vercel.app).
-- Notif ini terlihat untuk semua user (global, bukan per-user).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pengajuan_modal_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id     text NOT NULL,
  title          text NOT NULL,
  amount         numeric,
  submitter_name text,
  category       text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pengajuan_modal_notifications_expense_id_key
  ON public.pengajuan_modal_notifications (expense_id);

CREATE INDEX IF NOT EXISTS pengajuan_modal_notifications_created_at_idx
  ON public.pengajuan_modal_notifications (created_at DESC);

ALTER TABLE public.pengajuan_modal_notifications ENABLE ROW LEVEL SECURITY;

-- Semua user yang login boleh baca (badge notif untuk semua orang).
-- Insert hanya lewat service role (API webhook), jadi tidak perlu policy INSERT untuk client.
CREATE POLICY "authenticated can read pengajuan_modal_notifications"
  ON public.pengajuan_modal_notifications
  FOR SELECT
  TO authenticated
  USING (true);
