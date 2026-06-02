-- =====================================================
-- MIGRATION 02: SEED AUTH USERS
-- Sprint 1 / Foundation
--
-- Buat 6 user di auth.users (Supabase Auth) dan link
-- ke profile di public.users.
--
-- Password (semua user): YakinBisa123!
-- Hashing: bcrypt via pgcrypto.crypt()
--
-- Idempotent: aman dijalankan ulang. Email yang sudah
-- ada akan di-skip / di-update.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────
-- 1. Insert ke auth.users
-- ─────────────────────────────────────────────────────
-- Catatan: Supabase auth.users punya banyak kolom, tapi yang minimal
-- diperlukan untuk login email+password adalah:
--   id, instance_id, aud, role, email, encrypted_password,
--   email_confirmed_at, created_at, updated_at, raw_app_meta_data,
--   raw_user_meta_data
--
-- Email langsung di-confirm (email_confirmed_at = now()) supaya
-- bisa langsung login tanpa email verification.

WITH new_users (email, full_name) AS (
    VALUES
        ('nashwa@mst.id', 'Nashwa'),
        ('gema@mst.id',   'Gema'),
        ('haura@mst.id',  'Haura'),
        ('nazira@mst.id', 'Nazira'),
        ('zacky@mst.id',  'Zacky'),
        ('fadhil@mst.id', 'Fadhil')
)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    is_sso_user
)
SELECT
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    nu.email,
    crypt('YakinBisa123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('full_name', nu.full_name),
    FALSE,
    FALSE
FROM new_users nu
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE LOWER(au.email) = LOWER(nu.email)
);

-- ─────────────────────────────────────────────────────
-- 2. Insert auth identities (required by Supabase v2+)
-- ─────────────────────────────────────────────────────
-- Tanpa entry di auth.identities, signInWithPassword akan reject.

INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    au.id,
    jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true),
    'email',
    au.id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users au
WHERE au.email IN ('nashwa@mst.id', 'gema@mst.id', 'haura@mst.id', 'nazira@mst.id', 'zacky@mst.id', 'fadhil@mst.id')
  AND NOT EXISTS (
      SELECT 1 FROM auth.identities ai
      WHERE ai.user_id = au.id AND ai.provider = 'email'
  );

-- ─────────────────────────────────────────────────────
-- 3. Sync ke public.users (profile)
-- ─────────────────────────────────────────────────────
-- Strategy: untuk tiap email di auth.users yang nama-nya match
-- dengan public.users existing → update auth_user_id + email.
-- Untuk yang belum ada di public.users → insert baru.

-- 3a. Update existing user lama yang nama-nya cocok
UPDATE public.users pu
SET
    email        = au.email,
    auth_user_id = au.id,
    is_active    = TRUE
FROM auth.users au
WHERE LOWER(pu.name) = SPLIT_PART(au.email, '@', 1)
  AND au.email IN ('nashwa@mst.id', 'gema@mst.id', 'haura@mst.id', 'nazira@mst.id', 'zacky@mst.id', 'fadhil@mst.id')
  AND pu.auth_user_id IS NULL;

-- 3b. Insert profile baru untuk email yang belum punya match di public.users
INSERT INTO public.users (id, name, role, pin, email, division, is_active, is_admin, auth_user_id, created_at)
SELECT
    gen_random_uuid(),
    INITCAP(SPLIT_PART(au.email, '@', 1)),       -- 'nashwa@mst.id' → 'Nashwa'
    profile.role,
    '',                                           -- pin di-deprecate
    au.email,
    profile.division,
    TRUE,
    profile.is_admin,
    au.id,
    NOW()
FROM auth.users au
JOIN (
    VALUES
        ('nashwa@mst.id', 'Co-Founder & Project/Sprint Lead',      'Project',     TRUE),
        ('gema@mst.id',   'Co-Founder & Business Lead',            'Business',    FALSE),
        ('haura@mst.id',  'Co-Founder & Marketing Lead',           'Marketing',   FALSE),
        ('nazira@mst.id', 'Co-Founder & Design Lead',              'Design',      FALSE),
        ('zacky@mst.id',  'Co-Founder & Lead Developer',           'Development', FALSE),
        ('fadhil@mst.id', 'Developer',                             'Development', FALSE)
) AS profile(email, role, division, is_admin)
ON profile.email = au.email
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.auth_user_id = au.id
);

-- 3c. Pastikan flag is_admin sesuai (idempotent)
UPDATE public.users pu
SET is_admin = (au.email = 'nashwa@mst.id'),
    role     = COALESCE(profile.role, pu.role),
    division = COALESCE(profile.division, pu.division)
FROM auth.users au
JOIN (
    VALUES
        ('nashwa@mst.id', 'Co-Founder & Project/Sprint Lead', 'Project'),
        ('gema@mst.id',   'Co-Founder & Business Lead',       'Business'),
        ('haura@mst.id',  'Co-Founder & Marketing Lead',      'Marketing'),
        ('nazira@mst.id', 'Co-Founder & Design Lead',         'Design'),
        ('zacky@mst.id',  'Co-Founder & Lead Developer',      'Development'),
        ('fadhil@mst.id', 'Developer',                        'Development')
) AS profile(email, role, division) ON profile.email = au.email
WHERE pu.auth_user_id = au.id;

-- ─────────────────────────────────────────────────────
-- 4. Verifikasi
-- ─────────────────────────────────────────────────────
SELECT
    au.email,
    pu.name,
    pu.role,
    pu.division,
    pu.is_admin,
    pu.auth_user_id IS NOT NULL AS linked
FROM auth.users au
LEFT JOIN public.users pu ON pu.auth_user_id = au.id
WHERE au.email IN ('nashwa@mst.id', 'gema@mst.id', 'haura@mst.id', 'nazira@mst.id', 'zacky@mst.id', 'fadhil@mst.id')
ORDER BY au.email;

-- =====================================================
-- DONE — proceed to 03_migrate_legacy_tasks.sql (opsional)
-- =====================================================
