-- =====================================================
-- MIGRATION: Check-In Reminder Settings + Dedup Log
-- Date: 2026-08-07
--
-- 1. app_settings: key-value config, dipakai untuk simpan jam
--    reminder check-in (bisa diubah admin lewat UI, tanpa deploy).
-- 2. checkin_reminder_log: dedup, supaya endpoint aman dipanggil
--    berkali-kali dalam sehari oleh cron-job.org (external cron)
--    tanpa kirim WA dobel ke user yang sama.
--
-- PRA-SYARAT: scripts/rls-authorization-phase2b.sql sudah dijalankan
-- (perlu fungsi public.is_admin()).
--
-- Jalankan di Supabase SQL editor.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. APP_SETTINGS TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('checkin_reminder_hour', '10')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select ON app_settings;
CREATE POLICY app_settings_select ON app_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS app_settings_admin_insert ON app_settings;
CREATE POLICY app_settings_admin_insert ON app_settings
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS app_settings_admin_update ON app_settings;
CREATE POLICY app_settings_admin_update ON app_settings
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────
-- 2. CHECKIN_REMINDER_LOG TABLE (dedup per user per hari)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_reminder_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, reminder_date)
);

CREATE INDEX IF NOT EXISTS idx_checkin_reminder_log_date ON checkin_reminder_log(reminder_date);

-- Hanya diakses via service role (API route), sama seperti tabel lain di app ini.
ALTER TABLE checkin_reminder_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on checkin_reminder_log" ON checkin_reminder_log;
CREATE POLICY "Allow all on checkin_reminder_log" ON checkin_reminder_log
    FOR ALL USING (true) WITH CHECK (true);
