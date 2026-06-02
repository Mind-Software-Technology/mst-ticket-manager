-- =====================================================
-- MIGRATION 03: LEGACY TASKS → TICKETS (OPSIONAL)
-- Sprint 1 / Foundation
--
-- Migrasi data dari tabel `tasks` lama ke `tickets` baru.
-- Skip kalau tabel `tasks` kosong atau tidak ada.
--
-- Mapping:
--   tasks.task_id   → tickets.ticket_id
--   tasks.title     → tickets.subject
--   tasks.status    → tickets.state (3 → 10)
--   tasks.priority  → tickets.priority
--   tasks.pic_name  → tickets.assigned_to (lookup by name)
--   tasks.division  → tickets.division
--   tasks.start_date / end_date → tickets.start_date / due_date
--   tasks.report_link / blocker → di-append ke description
-- =====================================================

-- Cek dulu apakah tabel tasks ada & punya data
DO $$
DECLARE
    task_count INTEGER;
BEGIN
    -- Aman kalau tabel tidak ada
    SELECT COUNT(*) INTO task_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tasks';

    IF task_count = 0 THEN
        RAISE NOTICE 'Tabel `tasks` tidak ditemukan. Skip migrasi.';
        RETURN;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- INSERT migrasi
-- ─────────────────────────────────────────────────────
-- Hanya migrasi tasks yang task_id-nya belum ada di tickets.

INSERT INTO tickets (
    ticket_id,
    sequence,
    subject,
    description,
    category,
    state,
    priority,
    division,
    start_date,
    due_date,
    sprint_id,
    assigned_to,
    created_at
)
SELECT
    t.task_id,
    -- Sequence: extract angka dari task_id (e.g., 'SPT1-MKT1' → coba parse 1, fallback 1)
    COALESCE(NULLIF(REGEXP_REPLACE(t.task_id, '[^0-9]', '', 'g'), ''), '1')::INTEGER,
    t.title,
    -- Append blocker & report_link ke description kalau ada
    NULLIF(
        TRIM(BOTH E'\n' FROM
            CASE WHEN t.blocker IS NOT NULL AND t.blocker <> '' THEN E'**Blocker (legacy):** ' || t.blocker || E'\n\n' ELSE '' END ||
            CASE WHEN t.report_link IS NOT NULL AND t.report_link <> '' THEN E'**Report (legacy):** ' || t.report_link ELSE '' END
        ),
        ''
    ),
    'development'::ticket_category,
    CASE t.status
        WHEN 'Belum Mulai'        THEN 'backlog'::ticket_state
        WHEN 'Sedang Dikerjakan'  THEN 'on_progress'::ticket_state
        WHEN 'Selesai'            THEN 'done'::ticket_state
        ELSE 'backlog'::ticket_state
    END,
    CASE t.priority
        WHEN 'Rendah' THEN 'low'::ticket_priority
        WHEN 'Normal' THEN 'normal'::ticket_priority
        WHEN 'Tinggi' THEN 'high'::ticket_priority
        WHEN 'Kritis' THEN 'critical'::ticket_priority
        ELSE 'normal'::ticket_priority
    END,
    t.division,
    t.start_date,
    t.end_date,
    t.sprint_id,
    -- Lookup user by name (best-effort)
    (SELECT id FROM public.users u WHERE LOWER(u.name) = LOWER(t.pic_name) LIMIT 1),
    t.created_at
FROM tasks t
WHERE NOT EXISTS (
    SELECT 1 FROM tickets tk WHERE tk.ticket_id = t.task_id
);

-- ─────────────────────────────────────────────────────
-- Insert activity log untuk tiap tiket yang baru di-migrasi
-- ─────────────────────────────────────────────────────
INSERT INTO activity_logs (ticket_id, action_type, message, created_at)
SELECT
    tk.id,
    'created',
    'Tiket di-migrasi dari sistem lama (tasks)',
    tk.created_at
FROM tickets tk
WHERE NOT EXISTS (
    SELECT 1 FROM activity_logs al
    WHERE al.ticket_id = tk.id AND al.action_type = 'created'
);

-- ─────────────────────────────────────────────────────
-- Verifikasi
-- ─────────────────────────────────────────────────────
SELECT
    'tasks (legacy)'  AS source, COUNT(*) AS row_count FROM tasks
UNION ALL
SELECT
    'tickets (new)'   AS source, COUNT(*) AS row_count FROM tickets;

-- =====================================================
-- DONE — Sprint 1 migrations complete!
--
-- Next steps:
--   1. Jalankan `npm run dev` di project
--   2. Test login dengan email + password (YakinBisa123!)
--   3. Lanjut Sprint 2: Modul Gawean Core
-- =====================================================
