-- =====================================================
-- MIGRATION 04: REPAIR PROFILE LINKAGE
-- Sprint 1 / Foundation
--
-- Tujuan:
--   - Force-fix linkage antara auth.users dan public.users
--     untuk 6 email tim MST.
--   - Idempoten — aman dijalankan berkali-kali.
--   - Dipakai kalau setelah login tampil halaman blank atau
--     error "Profile Tidak Ditemukan".
--
-- Cara kerja:
--   1. Untuk setiap email tim, cari user di auth.users.
--   2. Cari profile di public.users by email (case-insensitive).
--   3. Kalau profile ada, set auth_user_id ke auth.users.id.
--   4. Kalau profile tidak ada, INSERT baru.
--   5. Pastikan flag is_admin sesuai (Nashwa = TRUE, lainnya = FALSE).
--
-- Aman: tidak menghapus data lama. Profile dengan nama lama
-- (Arhab, Jack, Zira) akan dipertahankan kalau email sudah
-- ke-set, atau dibuatkan profile baru sesuai email.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. Pastikan kolom-kolom yang dibutuhkan ada di public.users
-- ─────────────────────────────────────────────────────
-- (Re-run dari 01_schema.sql section 3 sebagai safety net)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS division VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────
-- 2. Repair linkage untuk tiap email
-- ─────────────────────────────────────────────────────

DO $$
DECLARE
    rec RECORD;
    auth_id UUID;
    profile_id UUID;
BEGIN
    FOR rec IN
        SELECT * FROM (VALUES
            ('nashwa@mst.id', 'Nashwa', 'Co-Founder & Project/Sprint Lead', 'Project',     TRUE),
            ('gema@mst.id',   'Gema',   'Co-Founder & Business Lead',      'Business',    FALSE),
            ('haura@mst.id',  'Haura',  'Co-Founder & Marketing Lead',     'Marketing',   FALSE),
            ('nazira@mst.id', 'Nazira', 'Co-Founder & Design Lead',        'Design',      FALSE),
            ('zacky@mst.id',  'Zacky',  'Co-Founder & Lead Developer',     'Development', FALSE),
            ('fadhil@mst.id', 'Fadhil', 'Developer',                       'Development', FALSE)
        ) AS t(email, name, role, division, is_admin)
    LOOP
        -- Cari auth.users row
        SELECT id INTO auth_id FROM auth.users WHERE LOWER(email) = LOWER(rec.email) LIMIT 1;

        IF auth_id IS NULL THEN
            RAISE NOTICE 'SKIP: auth user untuk % belum ada. Jalankan 02_seed_auth_users.sql dulu.', rec.email;
            CONTINUE;
        END IF;

        -- Coba match by email
        SELECT id INTO profile_id FROM public.users
        WHERE LOWER(email) = LOWER(rec.email)
        LIMIT 1;

        IF profile_id IS NOT NULL THEN
            UPDATE public.users SET
                auth_user_id = auth_id,
                email        = rec.email,
                name         = rec.name,
                role         = rec.role,
                division     = rec.division,
                is_admin     = rec.is_admin,
                is_active    = TRUE
            WHERE id = profile_id;
            RAISE NOTICE 'UPDATED via email: % → auth_user_id=%', rec.email, auth_id;
            CONTINUE;
        END IF;

        -- Fallback: match by name (kasus user lama yang nama-nya sama tapi email belum di-set)
        SELECT id INTO profile_id FROM public.users
        WHERE LOWER(name) = LOWER(rec.name) AND auth_user_id IS NULL
        LIMIT 1;

        IF profile_id IS NOT NULL THEN
            UPDATE public.users SET
                auth_user_id = auth_id,
                email        = rec.email,
                role         = rec.role,
                division     = rec.division,
                is_admin     = rec.is_admin,
                is_active    = TRUE
            WHERE id = profile_id;
            RAISE NOTICE 'UPDATED via name: % → auth_user_id=%', rec.email, auth_id;
            CONTINUE;
        END IF;

        -- Tidak ada — insert baru
        INSERT INTO public.users (id, name, role, pin, email, division, is_active, is_admin, auth_user_id, created_at)
        VALUES (
            gen_random_uuid(),
            rec.name,
            rec.role,
            '',
            rec.email,
            rec.division,
            TRUE,
            rec.is_admin,
            auth_id,
            NOW()
        );
        RAISE NOTICE 'INSERTED: % → auth_user_id=%', rec.email, auth_id;
    END LOOP;
END $$;

-- ─────────────────────────────────────────────────────
-- 3. Verifikasi
-- ─────────────────────────────────────────────────────
SELECT
    au.email,
    pu.id IS NOT NULL                AS profile_exists,
    pu.name,
    pu.role,
    pu.division,
    pu.is_admin,
    pu.auth_user_id IS NOT NULL      AS linked,
    (pu.auth_user_id = au.id)        AS link_correct
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_user_id = au.id OR LOWER(pu.email) = LOWER(au.email)
WHERE au.email IN ('nashwa@mst.id', 'gema@mst.id', 'haura@mst.id', 'nazira@mst.id', 'zacky@mst.id', 'fadhil@mst.id')
ORDER BY au.email;

-- =====================================================
-- DONE — semua row harus profile_exists=true, linked=true,
-- link_correct=true. Nashwa is_admin=true, lainnya false.
--
-- Setelah jalan, refresh halaman /debug di app dan login
-- ulang.
-- =====================================================
