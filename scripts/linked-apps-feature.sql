-- =====================================================
-- Migration: Linked Apps (menu "Aplikasi" di navbar)
--
-- Daftar link aplikasi eksternal yang ditautkan ke workspace ini
-- (mis. Pengajuan Modal). Semua user login boleh lihat & tambah,
-- hapus dibatasi admin saja — sama seperti pola master data lain
-- (lihat scripts/rls-authorization-phase2b.sql, fungsi public.is_admin()).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.linked_apps (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  url        text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linked_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read linked_apps"
  ON public.linked_apps FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert linked_apps"
  ON public.linked_apps FOR INSERT TO authenticated WITH CHECK (true);

-- Butuh public.is_admin() dari scripts/rls-authorization-phase2b.sql.
CREATE POLICY "linked_apps_admin_delete"
  ON public.linked_apps AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_admin());

INSERT INTO public.linked_apps (name, url, sort_order)
VALUES ('Pengajuan Modal', 'https://mst-pengajuan-modal.vercel.app/', 0)
ON CONFLICT (url) DO NOTHING;
