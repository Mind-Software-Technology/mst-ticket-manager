<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MST Ticket Manager — Agent Guide

## Project

ERP-style work tracking (Gawean tickets + daily Check-In).  
Next.js 16 App Router + React 19 + TailwindCSS 4 + Supabase (PostgreSQL).  
Auth: email+password via Supabase Auth (legacy PIN removed).  
Deployed on Vercel.

## Key files

| Purpose | Path |
|---------|------|
| Session hook (client) | `src/hooks/useSession.ts` |
| UI constants (states, priorities, transitions) | `src/lib/constants.ts` |
| Type definitions | `src/types/index.ts` |
| State machine validation | `src/lib/ticket-utils.ts` |
| Supabase client (browser) | `src/utils/supabase/client.ts` |
| Supabase client (server) | `src/utils/supabase/server.ts` |
| Maintenance mode gate (replaces middleware.ts) | `src/proxy.ts` |
| SQL migrations (apply manually in Supabase) | `scripts/*.sql` |

## Commands

```
npm run dev       # dev server (localhost:3000)
npm run build     # production build
npm run start     # start production server
npm run lint      # ESLint 9 flat config (eslint.config.mjs)
```

No test framework is configured.

## Important quirks

- **`proxy.ts` replaces `middleware.ts`** — Next.js 16 deprecates `middleware.ts`. The maintenance mode gate lives in `src/proxy.ts` with `export const config = { matcher: [...] }`.
- **Path alias** `@/*` maps to `src/*` (see `tsconfig.json`).
- **Auth profile lookup**: two-step — first by `auth_user_id`, fallback by `email` (supports migration-in-progress state).
- **TailwindCSS v4**: uses `@import "tailwindcss"` in `globals.css` (no `tailwind.config`), PostCSS plugin `@tailwindcss/postcss`.
- **ESLint 9 flat config**: `eslint.config.mjs` — do not create `.eslintrc.*`.
- **`useSession` hook** is the single source of truth for auth state. Every page checks `loading` then `session`.
- **State machine**: 10 states defined in `src/lib/constants.ts` (`STATE_TRANSITIONS`). Terminal states: `done`, `cancel`.
- **Admin pages**: `/admin` only visible to users with `is_admin=true` in `public.users`.
- **Vercel cron**: daily sprint reminder at 2 AM UTC (`vercel.json`).
- **`.env` is committed** (contains dev keys for Supabase + Telegram bot).

## Routes

| Path | Component | Auth |
|------|-----------|------|
| `/` | Login (email+password) | none |
| `/gawean` | Ticket list | any |
| `/gawean/new` | Create ticket | any |
| `/gawean/[id]` | Ticket detail/edit | any |
| `/checkin` | Check-in list | any |
| `/checkin/new` | New check-in | any |
| `/checkin/[id]` | Check-in detail | any |
| `/admin` | Dashboard (admin only) | `is_admin` |
| `/config` | CRUD clients/products/projects/users/labels | any |
| `/notes` | Personal notes (user "Nashwa" only) | specific user |
| `/debug` | Auth debug | any |
| `/maintenance` | Maintenance page | bypass via cookie |

## SQL migrations

All in `scripts/`. Apply sequentially via Supabase dashboard SQL editor.  
Not run automatically — apply manually when deploying schema changes.

## Vercel cron

`/api/cron/sprint-reminder` runs daily at 02:00 UTC (`vercel.json`).  
Protected by `CRON_SECRET` env var.
