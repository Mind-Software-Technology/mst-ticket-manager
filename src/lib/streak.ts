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
    const dateStr = toISODate(cursor);
    const dow = cursor.getDay(); // 0 = Minggu, 6 = Sabtu

    // Jika ada check-in pada hari ini (baik hari kerja maupun weekend), hitung!
    if (checkedInDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Jika tidak ada check-in, tapi ini adalah weekend, lewati tanpa memutus streak.
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Jika ini adalah hari ini (hari kerja) dan belum ada check-in, beri toleransi grace period.
    if (dateStr === todayStr && !toleratedToday) {
      toleratedToday = true;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Jika hari kerja lampau tidak ada check-in, streak terputus.
    break;
  }

  return streak;
}
