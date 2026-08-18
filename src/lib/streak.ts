// =====================================================
// Check-In Streak — Weekday Only (Senin-Jumat)
//
// Hitung berapa hari kerja berturut-turut seorang user
// check-in. Sabtu & Minggu dilewati (tidak wajib check-in,
// tapi juga tidak memutus streak).
// =====================================================

import { toISODate } from "@/lib/date-utils";

/**
 * Hitung streak check-in hari kerja (Senin-Jumat) dari kumpulan
 * tanggal (format "YYYY-MM-DD") tempat user pernah check-in.
 *
 * Aturan:
 * - Sabtu/Minggu dilewati begitu saja (tidak wajib, tidak memutus).
 * - Hari ini (kalau hari kerja) boleh belum check-in tanpa memutus
 *   streak dari hari-hari sebelumnya (grace period sampai hari berakhir).
 * - Begitu ketemu hari kerja *lampau* yang tidak ada check-in-nya,
 *   streak berhenti di situ.
 */
export function computeWeekdayStreak(
  checkedInDates: Set<string>,
  today: Date = new Date()
): { streak: number; missedDate: string | null } {
  let streak = 0;
  const cursor = new Date(today);
  const todayStr = toISODate(today);
  let toleratedToday = false;
  let missedDate: string | null = null;

  for (let i = 0; i < 3650; i++) {
    const dateStr = toISODate(cursor);
    const dow = cursor.getDay(); // 0 = Minggu, 6 = Sabtu

    if (checkedInDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (dateStr === todayStr && !toleratedToday) {
      toleratedToday = true;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Streak terputus! Ini adalah hari yang terlewat
    missedDate = dateStr;
    break;
  }

  return { streak, missedDate };
}

