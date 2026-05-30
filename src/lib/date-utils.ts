// =====================================================
// MST Ticket Manager — Date Utilities
// Sprint 1 / Foundation
//
// Helper untuk format tanggal/waktu dengan locale Indonesia.
// =====================================================

const ID_LOCALE = "id-ID";

/**
 * Format ISO date string ke format Indonesia.
 *
 * @example
 *   formatDate("2026-05-29")           // "29 Mei 2026"
 *   formatDate("2026-05-29", "short")  // "29 Mei 2026"
 *   formatDate("2026-05-29", "numeric") // "29/05/2026"
 */
export function formatDate(
  input: string | Date | null | undefined,
  variant: "long" | "short" | "numeric" = "short",
): string {
  if (!input) return "-";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "-";

  switch (variant) {
    case "long":
      return date.toLocaleDateString(ID_LOCALE, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    case "numeric":
      return date.toLocaleDateString(ID_LOCALE, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    case "short":
    default:
      return date.toLocaleDateString(ID_LOCALE, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
  }
}

/**
 * Format datetime ke "29 Mei 2026, 14:30".
 */
export function formatDateTime(
  input: string | Date | null | undefined,
): string {
  if (!input) return "-";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(ID_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Relative time dalam Bahasa Indonesia.
 * Contoh: "5 menit lalu", "2 jam lalu", "3 hari lalu", "2 bulan lalu".
 */
export function relativeTime(
  input: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!input) return "-";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "-";

  const diffSec = Math.round((now.getTime() - date.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const suffix = diffSec >= 0 ? "lalu" : "lagi";

  if (abs < 5) return "baru saja";
  if (abs < 60) return `${abs} detik ${suffix}`;

  const minutes = Math.floor(abs / 60);
  if (minutes < 60) return `${minutes} menit ${suffix}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam ${suffix}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari ${suffix}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} minggu ${suffix}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan ${suffix}`;

  const years = Math.floor(days / 365);
  return `${years} tahun ${suffix}`;
}

/**
 * Cek apakah dua tanggal jatuh pada hari yang sama (locale lokal).
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Awal hari (00:00:00.000) dari tanggal yang diberikan.
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Akhir hari (23:59:59.999) dari tanggal yang diberikan.
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Hitung selisih hari antara `due_date` dan hari ini.
 * Positif = belum jatuh tempo, negatif = sudah lewat.
 */
export function daysUntil(input: string | Date | null | undefined): number | null {
  if (!input) return null;
  const target = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(target.getTime())) return null;
  const today = startOfDay();
  const due = startOfDay(target);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
