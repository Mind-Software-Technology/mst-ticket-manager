// =====================================================
// Permission helpers — single source of truth
// Sprint 2 / Modul Gawean
//
// Permission table (lihat docs):
//   create ticket  → admin only
//   edit ticket    → admin + assignee
//   update state   → admin + assignee
//   view           → semua user login
// =====================================================

import type { Ticket, User } from "@/types";

/**
 * Profile minimal yang dibutuhkan oleh permission helpers.
 * Sengaja Pick supaya bisa dipakai dengan SessionUser['profile'] atau
 * raw row dari public.users.
 */
type ProfileLike = Pick<User, "id" | "is_admin">;

/**
 * Hanya admin yang boleh bikin tiket baru.
 */
export function canCreateTicket(profile: ProfileLike | null | undefined): boolean {
  return Boolean(profile?.is_admin);
}

/**
 * Edit field tiket: admin atau assignee dari tiket itu sendiri.
 */
export function canEditTicket(
  ticket: Pick<Ticket, "assigned_to"> | null | undefined,
  profile: ProfileLike | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.is_admin) return true;
  return Boolean(ticket?.assigned_to && ticket.assigned_to === profile.id);
}

/**
 * Update state ticket: sama dengan canEditTicket. Dibedakan supaya
 * lebih ekspresif di UI (pesan tooltip, dll).
 */
export function canUpdateState(
  ticket: Pick<Ticket, "assigned_to"> | null | undefined,
  profile: ProfileLike | null | undefined,
): boolean {
  return canEditTicket(ticket, profile);
}

/**
 * Boleh akses halaman config / master data (clients, products, dll).
 * Sprint 2 belum implement halaman config — placeholder untuk Sprint 4.
 */
export function canManageConfig(profile: ProfileLike | null | undefined): boolean {
  return Boolean(profile?.is_admin);
}
