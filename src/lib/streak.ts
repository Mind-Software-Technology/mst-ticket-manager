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
): number {
  let streak = 0;
  const cursor = new Date(today);
  const todayStr = toISODate(today);
  let toleratedToday = false;

  // Batas pengaman supaya tidak infinite loop kalau ada bug data.
  for (let i = 0; i < 3650; i++) {
    const dow = cursor.getDay(); // 0 = Minggu, 6 = Sabtu
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const dateStr = toISODate(cursor);

    if (checkedInDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (dateStr === todayStr && !toleratedToday) {
      // Belum check-in hari ini — beri toleransi, jangan putus dulu.
      toleratedToday = true;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
}
