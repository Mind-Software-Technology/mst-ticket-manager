// =====================================================
// Menu navbar & hak akses menu
//
// Daftar menu yang bisa diatur per user oleh Co-Founder & Project/Sprint
// Lead (halaman /akses). Data akses ada di tabel public.menu_access.
// =====================================================

export const MANAGER_ROLE = "Co-Founder & Project/Sprint Lead";

export type MenuKey = "admin" | "gawean" | "kanban" | "checkin" | "leaderboard" | "config" | "notes";

export interface MenuDef {
  key: MenuKey;
  href: string;
  label: string;
  desc: string;
}

export const MENU_DEFS: MenuDef[] = [
  { key: "admin", href: "/admin", label: "Dashboard", desc: "Ringkasan admin (tetap butuh status admin)" },
  { key: "gawean", href: "/gawean", label: "Gawean", desc: "Daftar & detail tiket" },
  { key: "kanban", href: "/kanban", label: "Kanban", desc: "Papan kanban tiket" },
  { key: "checkin", href: "/checkin", label: "Check In", desc: "Check-in harian" },
  { key: "leaderboard", href: "/leaderboard", label: "Peringkat", desc: "Papan peringkat & minigame" },
  { key: "config", href: "/config", label: "Config", desc: "Master data (klien, produk, user, dll.)" },
  { key: "notes", href: "/notes", label: "Catatan Ide", desc: "Catatan pribadi" },
];

export const ALL_MENU_KEYS = MENU_DEFS.map((m) => m.key);

export const isMenuManager = (profile: { role: string }) => profile.role === MANAGER_ROLE;

/** Menu yang memiliki path ini (termasuk sub-halaman), atau null kalau bukan menu yang diatur. */
export function menuForPath(pathname: string | null): MenuKey | null {
  if (!pathname) return null;
  const hit = MENU_DEFS.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));
  return hit?.key ?? null;
}
