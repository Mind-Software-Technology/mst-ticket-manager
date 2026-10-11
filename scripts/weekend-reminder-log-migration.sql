-- =====================================================
-- Migration: Weekend Reminder Log
--
-- Tabel dedup untuk mencegah double-kirim notifikasi
-- WA pengingat akhir pekan (Sabtu & Minggu) ke user
-- yang sama di hari yang sama.
--
-- Sama polanya dengan checkin_reminder_log.
-- =====================================================

create table if not exists weekend_reminder_log (
  user_id       uuid        not null references users(id) on delete cascade,
  reminder_date date        not null,
  sent_at       timestamptz not null default now(),
  primary key (user_id, reminder_date)
);

-- Index untuk lookup cepat per tanggal
create index if not exists idx_weekend_reminder_log_date
  on weekend_reminder_log (reminder_date);

-- Hapus log lama setelah 90 hari (opsional, untuk kebersihan data)
-- Bisa dijalankan manual atau via pg_cron jika tersedia.
-- delete from weekend_reminder_log where reminder_date < current_date - interval '90 days';

comment on table weekend_reminder_log is
  'Dedup log pengiriman WA pengingat akhir pekan. '
  'Satu baris per (user, tanggal). Dicek sebelum kirim untuk '
  'mencegah double-send jika cron dipanggil lebih dari sekali.';
