-- =====================================================
-- MIGRATION: Check-In Module (Daily Standup)
-- Date: 2026-06-09
--
-- Menambahkan tabel checkins + checkin_items untuk modul
-- daily check-in gaya ERP "Gawean".
--
-- Jalankan di Supabase SQL editor.
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. ENUM checkin_status (idempotent)
-- ─────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checkin_status') THEN
        CREATE TYPE checkin_status AS ENUM ('draft', 'approved');
    END IF;
END$$;

-- ─────────────────────────────────────────────────────
-- 2. CHECKINS TABLE
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division VARCHAR(100),
    yesterday_problem TEXT,
    status checkin_status DEFAULT 'approved',
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- 3. CHECKIN ITEMS TABLE (Focus Today)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkin_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- ─────────────────────────────────────────────────────
-- 4. updated_at trigger (reuse fn kalau sudah ada)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS checkins_updated_at ON checkins;
CREATE TRIGGER checkins_updated_at
    BEFORE UPDATE ON checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_checkins_employee ON checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkin_items_checkin ON checkin_items(checkin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_items_ticket ON checkin_items(ticket_id);

-- ─────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (MVP: allow all, samakan dgn tabel lain)
-- ─────────────────────────────────────────────────────
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on checkins" ON checkins;
CREATE POLICY "Allow all on checkins" ON checkins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on checkin_items" ON checkin_items;
CREATE POLICY "Allow all on checkin_items" ON checkin_items FOR ALL USING (true) WITH CHECK (true);
