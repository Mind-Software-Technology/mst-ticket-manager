-- =====================================================
-- Migration: Hak akses menu per user
--
-- Co-Founder & Project/Sprint Lead menentukan menu navbar apa saja yang
-- boleh dibuka tiap anggota tim (halaman /akses).
--
--   * Tidak ada baris untuk seorang user  -> semua menu terbuka (perilaku lama).
--   * Ada baris                           -> hanya menu di kolom `menus`.
--
-- Semua user login boleh MEMBACA (navbar butuh baris miliknya sendiri);
-- hanya role "Co-Founder & Project/Sprint Lead" yang boleh MENGUBAH.
-- Pengecekan role dilakukan di database (bukan hanya di UI).
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_menu_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.role = 'Co-Founder & Project/Sprint Lead'
       FROM public.users u
      WHERE u.auth_user_id = auth.uid()
      LIMIT 1),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_menu_manager() FROM public;
GRANT EXECUTE ON FUNCTION public.is_menu_manager() TO authenticated;

CREATE TABLE IF NOT EXISTS public.menu_access (
  user_id    uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  menus      text[] NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read menu_access"
  ON public.menu_access FOR SELECT TO authenticated USING (true);

CREATE POLICY "menu manager can insert menu_access"
  ON public.menu_access FOR INSERT TO authenticated
  WITH CHECK (public.is_menu_manager());

CREATE POLICY "menu manager can update menu_access"
  ON public.menu_access FOR UPDATE TO authenticated
  USING (public.is_menu_manager()) WITH CHECK (public.is_menu_manager());

CREATE POLICY "menu manager can delete menu_access"
  ON public.menu_access FOR DELETE TO authenticated
  USING (public.is_menu_manager());
