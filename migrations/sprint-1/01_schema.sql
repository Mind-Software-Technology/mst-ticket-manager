-- =====================================================
-- MIGRATION 01: SCHEMA — MST Ticket Manager v2.0
-- Sprint 1 / Foundation
-- Date: 2026-05-29
--
-- Tujuan:
--   - Tambah ENUM types (ticket_state, ticket_priority, ticket_category, checkin_status)
--   - Buat tabel master: clients, products, projects, labels
--   - Buat tabel transaksi: tickets, ticket_labels, ticket_attachments,
--     activity_logs, checkins, checkin_items
--   - Alter tabel users (tambah email, division, is_active, is_admin, auth_user_id, created_at)
--   - Function helper: generate_ticket_id, update_updated_at
--   - RLS permissive untuk MVP (dipersempit di sprint berikutnya)
--   - Indexes untuk query performance
--
-- Idempotency: pakai IF NOT EXISTS / IF EXISTS sebanyak mungkin.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. ENUM TYPES
-- ─────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE ticket_state AS ENUM (
        'backlog',
        'todo',
        'need_fix',
        'on_progress',
        'code_review',
        'ready_for_qa',
        'in_qa',
        'ready_to_deploy',
        'done',
        'cancel'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM (
        'critical',
        'high',
        'normal',
        'low'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ticket_category AS ENUM (
        'service_support',
        'finance_sales',
        'development',
        'infrastructure_operations',
        'qa_testing',
        'coordination_management',
        'design_ui_ux',
        'internal_learning'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE checkin_status AS ENUM ('draft', 'approved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─────────────────────────────────────────────────────
-- 2. SHARED TRIGGER FUNCTION (auto-update updated_at)
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────
-- 3. ALTER USERS TABLE — tambah kolom Sprint 1
-- ─────────────────────────────────────────────────────
-- Catatan: tabel `users` SUDAH ada dari schema lama (id, name, role, pin).
-- Kita tambah kolom baru tanpa drop data lama.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS division VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_user ON users(auth_user_id);

-- ─────────────────────────────────────────────────────
-- 4. CLIENTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 5. PRODUCTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    prefix VARCHAR(10) NOT NULL UNIQUE,    -- e.g., 'ZB', 'DOB', 'INO'
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 6. PROJECTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 7. LABELS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6366f1'
);

INSERT INTO labels (name, color) VALUES
    ('System Request', '#3b82f6'),
    ('Carry Over', '#8b5cf6'),
    ('Bug Fix', '#ef4444'),
    ('Feature', '#22c55e'),
    ('Enhancement', '#f59e0b'),
    ('Documentation', '#6b7280')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- 8. TICKETS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identification
    ticket_id VARCHAR(50) NOT NULL UNIQUE,
    sequence INTEGER NOT NULL DEFAULT 1,

    -- Content
    subject TEXT NOT NULL,
    description TEXT,

    -- Classification
    category ticket_category DEFAULT 'development',
    state ticket_state DEFAULT 'backlog',
    priority ticket_priority DEFAULT 'normal',

    -- Time tracking
    manhours_estimate INTEGER DEFAULT 0,
    actual_manhours DECIMAL(10,2) DEFAULT 0.00,
    need_qa BOOLEAN DEFAULT FALSE,

    -- Dates
    start_date DATE,
    due_date DATE,
    done_date DATE,

    -- Relations
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_to UUID REFERENCES users(id) ON DELETE SET NULL,
    division VARCHAR(100),
    sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,

    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────
-- 9. TICKET LABELS (junction)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    UNIQUE(ticket_id, label_id)
);

-- ─────────────────────────────────────────────────────
-- 10. TICKET ATTACHMENTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 11. ACTIVITY LOGS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,    -- 'state_change' | 'field_update' | 'comment' | 'checkin_ref' | 'created'
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 12. CHECKINS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division VARCHAR(100),
    yesterday_problem TEXT,
    -- Default 'approved' karena sesuai keputusan: auto-approve check-in.
    status checkin_status DEFAULT 'approved',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS checkins_updated_at ON checkins;
CREATE TRIGGER checkins_updated_at
    BEFORE UPDATE ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────
-- 13. CHECKIN ITEMS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────────────
-- 14. TICKET ID GENERATOR
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_ticket_id(product_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence), 0) + 1 INTO next_seq
    FROM tickets
    WHERE ticket_id LIKE product_prefix || '-%';

    RETURN product_prefix || '-' || next_seq;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────
-- 15. ROW LEVEL SECURITY (permissive untuk MVP)
-- ─────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Allow all on clients" ON clients;
DROP POLICY IF EXISTS "Allow all on products" ON products;
DROP POLICY IF EXISTS "Allow all on projects" ON projects;
DROP POLICY IF EXISTS "Allow all on labels" ON labels;
DROP POLICY IF EXISTS "Allow all on tickets" ON tickets;
DROP POLICY IF EXISTS "Allow all on ticket_labels" ON ticket_labels;
DROP POLICY IF EXISTS "Allow all on ticket_attachments" ON ticket_attachments;
DROP POLICY IF EXISTS "Allow all on activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow all on checkins" ON checkins;
DROP POLICY IF EXISTS "Allow all on checkin_items" ON checkin_items;

CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on labels" ON labels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ticket_labels" ON ticket_labels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ticket_attachments" ON ticket_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on checkin_items" ON checkin_items FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────
-- 15b. TABLE-LEVEL GRANTS (wajib, terpisah dari RLS)
-- ─────────────────────────────────────────────────────
-- RLS bekerja DI ATAS lapisan GRANT. Tanpa GRANT, query ditolak
-- dengan "permission denied for table X" sebelum RLS dievaluasi.
-- Tabel yang dibuat lewat SQL Editor (CREATE TABLE mentah) tidak
-- otomatis dapat grant ke role anon/authenticated — jadi harus
-- eksplisit di sini. Kalau lupa, halaman /debug akan menunjukkan
-- "permission denied for table users".
--
-- Detail lebih lengkap + grant untuk tabel lama → lihat
-- 05_grant_table_privileges.sql.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
    TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public
    TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public
    TO anon, authenticated, service_role;

-- Default privileges supaya tabel/sequence/function baru ke depan
-- otomatis dapat grant tanpa harus ingat re-run migration ini.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────
-- 16. INDEXES
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_state         ON tickets(state);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned      ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_client        ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_product       ON tickets(product_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project       ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sprint        ON tickets(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tickets_due_date      ON tickets(due_date);
CREATE INDEX IF NOT EXISTS idx_tickets_created       ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_ticket  ON activity_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_employee     ON checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created      ON checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_items_ticket  ON checkin_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkin_items_checkin ON checkin_items(checkin_id);

-- =====================================================
-- DONE — proceed to 02_seed_auth_users.sql
-- =====================================================
