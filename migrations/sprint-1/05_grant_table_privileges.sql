-- =====================================================
-- MIGRATION 05: GRANT TABLE PRIVILEGES
-- Sprint 1 / Foundation
--
-- Tujuan:
--   Fix error "permission denied for table users" (dan tabel lain)
--   yang muncul di halaman /debug dan saat app coba akses Supabase.
--
-- Latar belakang:
--   Postgres punya 2 lapis access control:
--     1) GRANT (table-level) — apakah role boleh SELECT/INSERT/dll
--        ke tabel sama sekali.
--     2) RLS policy (row-level) — kalau lolos GRANT, baris mana yg
--        boleh diakses.
--
--   Migration 01 sudah ENABLE RLS + CREATE POLICY USING (true), tapi
--   belum pernah GRANT ke role 'anon' & 'authenticated'. Kalau tabel
--   dibuat via SQL Editor (CREATE TABLE mentah), Supabase TIDAK
--   auto-grant — beda dengan tabel yang dibuat via Table Editor UI.
--
--   Akibatnya: query dari client (PostgREST) ditolak di level GRANT
--   sebelum RLS bahkan dievaluasi → "permission denied for table X".
--
-- Idempoten: GRANT bisa di-run berulang kali tanpa efek samping.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Schema-level USAGE
-- ─────────────────────────────────────────────────────
-- Tanpa USAGE pada schema, role tidak bisa "melihat" object di dalamnya.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 2. Grant pada SEMUA tabel existing di schema public
-- ─────────────────────────────────────────────────────
-- Pakai blanket grant untuk pastikan tabel lama (sprints, tasks, users)
-- maupun tabel baru (tickets, clients, dll) ter-cover sekaligus.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
    TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ─────────────────────────────────────────────────────
-- 3. Grant pada SEMUA sequence di schema public
-- ─────────────────────────────────────────────────────
-- Walau kita pakai gen_random_uuid() (bukan SERIAL), grant ini murah
-- dan bikin migrasi tahan banting kalau di masa depan ada SERIAL/IDENTITY.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public
    TO anon, authenticated;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ─────────────────────────────────────────────────────
-- 4. Grant pada SEMUA function di schema public
-- ─────────────────────────────────────────────────────
-- generate_ticket_id() dan update_updated_at() perlu EXECUTE
-- untuk client/role tertentu kalau dipanggil via RPC. Aman untuk
-- di-grant sekarang.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
    TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 5. ALTER DEFAULT PRIVILEGES — supaya tabel masa depan auto-grant
-- ─────────────────────────────────────────────────────
-- Tanpa ini, setiap kali bikin tabel baru via SQL Editor kita harus
-- ingat grant manual lagi. Setting di bawah memastikan tabel/sequence/
-- function baru otomatis dapat grant.
--
-- Catatan: ALTER DEFAULT PRIVILEGES hanya berlaku untuk object yg
-- dibuat oleh role yang menjalankannya. Di Supabase SQL Editor,
-- biasanya kita run sebagai role 'postgres'. Itu cukup untuk
-- mayoritas pemakaian (semua object yg dibuat di SQL Editor di-create
-- oleh postgres).

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
    TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES
    TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES
    TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES
    TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS
    TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 6. Verifikasi
-- ─────────────────────────────────────────────────────
-- Hasil yang diharapkan: setiap tabel app punya minimal 4 baris
-- (SELECT, INSERT, UPDATE, DELETE) untuk role 'anon' DAN 'authenticated'.

SELECT
    table_name,
    grantee,
    string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
  AND table_name IN (
      'users', 'sprints', 'tasks',
      'clients', 'products', 'projects', 'labels',
      'tickets', 'ticket_labels', 'ticket_attachments',
      'activity_logs', 'checkins', 'checkin_items'
  )
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- =====================================================
-- DONE — refresh halaman /debug. allUsersSample harus
-- terisi 6 baris dan profileByAuthId harus ketemu.
--
-- Kalau masih "permission denied" setelah ini, periksa:
--   - Apakah migration di-run di project Supabase yang benar
--     (bandingkan URL di Settings → API dengan NEXT_PUBLIC_SUPABASE_URL)
--   - Apakah role yg menjalankan migration adalah 'postgres'
--     (default di SQL Editor) dan bukan role lain
-- =====================================================
