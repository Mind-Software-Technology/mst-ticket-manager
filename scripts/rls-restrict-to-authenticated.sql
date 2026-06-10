-- =====================================================================
-- RLS Lockdown — Phase 1: tutup akses ANONIM (analysis #1 / kode merah)
--
-- Masalah: setiap tabel punya policy "Allow all ... USING(true)" dengan
-- role `public` (= anon + authenticated). Akibatnya siapa pun dengan anon
-- key publik (tertanam di bundle browser) bisa baca/tulis/hapus seluruh DB
-- TANPA login.
--
-- Phase 1 (low-risk): pindahkan policy dari role `public` -> `authenticated`.
-- App tetap jalan karena sudah memakai client authenticated (sejak #1).
-- Ini HANYA menutup akses anonim; pengetatan per-tabel ada di Phase 2.
--
-- Dibiarkan apa adanya:
--   * user_notes      -> sudah ter-scope (auth.uid() = user_id), aman.
--   * ticket_counters -> tanpa policy, hanya via RPC SECURITY DEFINER.
--
-- JALANKAN di Supabase SQL Editor.
-- =====================================================================

ALTER POLICY "Allow all on activity_logs"      ON public.activity_logs      TO authenticated;
ALTER POLICY "Allow all on checkin_items"      ON public.checkin_items      TO authenticated;
ALTER POLICY "Allow all on checkins"           ON public.checkins           TO authenticated;
ALTER POLICY "Allow all on clients"            ON public.clients            TO authenticated;
ALTER POLICY "Allow all on labels"             ON public.labels             TO authenticated;
ALTER POLICY "Allow all on products"           ON public.products           TO authenticated;
ALTER POLICY "Allow all on projects"           ON public.projects           TO authenticated;
ALTER POLICY "Allow all actions on sprints"    ON public.sprints            TO authenticated;
ALTER POLICY "Allow all actions on tasks"      ON public.tasks              TO authenticated;
ALTER POLICY "Allow all on ticket_attachments" ON public.ticket_attachments TO authenticated;
ALTER POLICY "Allow all on ticket_labels"      ON public.ticket_labels      TO authenticated;
ALTER POLICY "Allow all on tickets"            ON public.tickets            TO authenticated;
ALTER POLICY "Allow all actions on users"      ON public.users              TO authenticated;

-- ── Verifikasi: HARUS 0 baris (tidak ada lagi policy permisif utk anon/public) ──
SELECT tablename, policyname, roles, cmd, qual
  FROM pg_policies
 WHERE schemaname = 'public'
   AND (qual = 'true' OR qual IS NULL)
   AND ('anon' = ANY(roles) OR 'public' = ANY(roles));
