# Sprint 1 — Database Migrations

Migrasi ini mengubah database MST Ticket Manager dari skema lama (`tasks`, basic `users`) ke skema baru ERP-style sesuai TRD §2.

## Cara Eksekusi

Jalankan **berurutan** di **Supabase SQL Editor** (https://app.supabase.com → Project → SQL Editor → New query):

| Urutan | File | Tujuan | Wajib? |
|--------|------|--------|--------|
| 1 | `01_schema.sql` | Buat semua tabel baru, ENUM, function, trigger, RLS, GRANT, indexes | ✅ Wajib |
| 2 | `02_seed_auth_users.sql` | Seed 6 user di Supabase Auth + profile di `public.users` | ✅ Wajib |
| 3 | `03_migrate_legacy_tasks.sql` | (Opsional) copy data `tasks` → `tickets` | ⚠️ Skip kalau tidak ada data |
| 4 | `04_repair_profile_linkage.sql` | (Troubleshoot) force-fix linkage auth↔profile | ⚠️ Hanya kalau login bermasalah |
| 5 | `05_grant_table_privileges.sql` | (Troubleshoot) GRANT ke `anon`/`authenticated` untuk tabel lama | ⚠️ Wajib kalau muncul `permission denied for table ...` |

> **⚠️ Penting**: Backup database dulu sebelum eksekusi. Migrasi ini menghapus data `public.users` yang lama.

## Cek Hasil

Setelah `01_schema.sql`:
```sql
-- Cek tabel ada
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
-- Harus muncul: clients, products, projects, labels, tickets, ticket_labels, ticket_attachments,
-- activity_logs, checkins, checkin_items (selain tabel lama: sprints, tasks, users)
```

Setelah `02_seed_auth_users.sql`:
```sql
-- Cek 6 user terdaftar
SELECT u.email, p.name, p.is_admin FROM auth.users u 
  JOIN public.users p ON p.auth_user_id = u.id ORDER BY p.name;
```

Lalu test login di app: `npm run dev` → buka http://localhost:3000 → login dengan email apapun + password `YakinBisa123!`.

## Troubleshooting

### "permission denied for table users" (atau tabel lain)

Muncul di halaman `/debug` sebagai `profileByAuthIdError` / `allUsersError`. Ini **bukan** masalah RLS — ini missing table-level GRANT.

Penyebab: tabel yang dibuat lewat SQL Editor (`CREATE TABLE` mentah) tidak otomatis dapat grant ke role `anon` / `authenticated`. Beda dengan tabel yang dibuat via Supabase Table Editor UI.

Fix: jalankan `05_grant_table_privileges.sql` di Supabase SQL Editor. Sesudah itu refresh `/debug` — `allUsersSample` harus terisi dan `profileByAuthId` ketemu.

> Catatan: `01_schema.sql` versi terbaru sudah include block GRANT, jadi fresh install ke depan tidak akan kena masalah ini. Migration 05 hanya diperlukan kalau database sudah ada sebelum patch tersebut.

### "Setelah login layar kosong / blank"

Penyebab paling umum: profile di `public.users` belum di-link ke `auth.users`. Solusinya:

1. Buka `http://localhost:3000/debug` — halaman ini menampilkan state auth + profile lengkap. Klik **Copy as JSON** dan paste hasilnya kalau butuh bantuan diagnosa.
2. Kalau debug menunjukkan `permission denied`, jalankan `05_grant_table_privileges.sql` dulu (lihat di atas).
3. Jalankan `04_repair_profile_linkage.sql` di Supabase SQL Editor.
4. Refresh halaman `/debug` — semua kolom harus `linked = true` dan `link_correct = true`.
5. Sign out & login ulang.

### "auth.users punya entry tapi tidak bisa login"

Cek `auth.identities` — tiap user wajib punya entry dengan `provider = 'email'`. Re-run `02_seed_auth_users.sql` (idempotent, hanya insert yang belum ada).

### Halaman `/debug`

URL: `http://localhost:3000/debug`. Bisa diakses tanpa login. Menampilkan:
- Env vars Supabase (URL & key)
- Status `auth.session`
- Profile lookup by `auth_user_id` dan by `email`
- Sample 10 row dari `public.users`
- Tombol Force Sign Out

## Akun yang Disediakan

| Email | Nama | Role | Admin? |
|-------|------|------|--------|
| nashwa@mst.id | Nashwa | Co-Founder & Project Lead | ✅ |
| gema@mst.id | Gema | Co-Founder & Business Lead | — |
| haura@mst.id | Haura | Co-Founder & Marketing Lead | — |
| nazira@mst.id | Nazira | Co-Founder & Design Lead | — |
| zacky@mst.id | Zacky | Co-Founder & Lead Developer | — |
| fadhil@mst.id | Fadhil | Developer | — |

Password (semua): `YakinBisa123!`

## Rollback

Kalau ada masalah:
```sql
-- DESTRUKTIF! Hanya untuk dev environment
DROP TABLE IF EXISTS checkin_items, checkins, activity_logs, ticket_attachments, 
  ticket_labels, tickets, labels, projects, products, clients CASCADE;
DROP TYPE IF EXISTS ticket_state, ticket_priority, ticket_category, checkin_status;
DROP FUNCTION IF EXISTS generate_ticket_id, update_updated_at;
-- Optional: drop kolom yang ditambahkan ke users
ALTER TABLE users DROP COLUMN IF EXISTS email, DROP COLUMN IF EXISTS division,
  DROP COLUMN IF EXISTS is_active, DROP COLUMN IF EXISTS is_admin,
  DROP COLUMN IF EXISTS auth_user_id, DROP COLUMN IF EXISTS created_at;
```
