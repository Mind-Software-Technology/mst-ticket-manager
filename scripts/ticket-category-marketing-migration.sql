-- =====================================================
-- Add 'marketing' value to ticket_category enum
--
-- Frontend (src/lib/constants.ts) already offers "Marketing"
-- as a ticket category, but the DB enum never got this value,
-- causing: invalid input value for enum ticket_category: "marketing"
-- =====================================================

ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'marketing';
