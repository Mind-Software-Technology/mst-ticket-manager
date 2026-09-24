-- =====================================================================
-- Fitur @mention di Activity Log (Progress/Reply)
--
-- User bisa tag rekan kerja dengan mengetik "@nama" di komentar / progress
-- reply pada activity log tiket. User yang di-tag dapat notifikasi in-app
-- (lonceng di navbar).
--
-- Tabel `mention_notifications`: 1 baris = 1 user di-mention di 1 komentar.
-- RLS: user hanya bisa baca & mark-read notifikasi miliknya sendiri;
-- insert hanya boleh atas nama diri sendiri (mentioned_by = profile login).
--
-- JALANKAN di Supabase SQL Editor (prod `main`). Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.mention_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id          uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  activity_log_id    uuid REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  mentioned_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mentioned_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  excerpt            text,
  read_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mention_notifications_recipient_idx
  ON public.mention_notifications (mentioned_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mention_notifications_unread_idx
  ON public.mention_notifications (mentioned_user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.mention_notifications ENABLE ROW LEVEL SECURITY;

-- Baca hanya notifikasi milik sendiri (dirinya yang di-mention).
DROP POLICY IF EXISTS "read own mention_notifications" ON public.mention_notifications;
CREATE POLICY "read own mention_notifications"
  ON public.mention_notifications
  FOR SELECT
  TO authenticated
  USING (
    mentioned_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Insert boleh siapa saja yang login (penulis komentar men-tag orang lain);
-- mentioned_by wajib cocok dengan profile user yang sedang login (atau NULL).
DROP POLICY IF EXISTS "insert mention_notifications as self" ON public.mention_notifications;
CREATE POLICY "insert mention_notifications as self"
  ON public.mention_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    mentioned_by IS NULL
    OR mentioned_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Update (mark as read) hanya untuk notifikasi milik sendiri.
DROP POLICY IF EXISTS "mark own mention_notifications as read" ON public.mention_notifications;
CREATE POLICY "mark own mention_notifications as read"
  ON public.mention_notifications
  FOR UPDATE
  TO authenticated
  USING (
    mentioned_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    mentioned_user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );
