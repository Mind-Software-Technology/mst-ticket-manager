// =====================================================
// Check-In Streak — Configurable Active Days
//
// Hitung berapa hari aktif berturut-turut seorang user
// check-in. Hari yang TIDAK termasuk "hari aktif" dilewati
// (tidak wajib check-in, tapi juga tidak memutus streak).
//
// Hari aktif bisa diatur admin lewat Config → Checkin Days.
// Default: Senin-Jumat (1-5).
// =====================================================

import { toISODate } from "@/lib/date-utils";

/** Default hari aktif: Senin(1) - Jumat(5). */
export const DEFAULT_ACTIVE_DAYS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5]);

/**
 * Hitung streak check-in dari kumpulan tanggal (format "YYYY-MM-DD")
 * tempat user pernah check-in.
 *
 * @param checkedInDates    Set tanggal "YYYY-MM-DD" user pernah check-in.
 * @param today             Tanggal acuan (default: hari ini).
 * @param activeDays        Set angka hari aktif (0=Minggu, 1=Senin, ..., 6=Sabtu).
 *                          Default: Senin-Jumat {1,2,3,4,5}.
 * @param activeDaysSince   Tanggal "YYYY-MM-DD" mulai berlakunya `activeDays`.
 *                          Untuk tanggal sebelum ini, pakai DEFAULT_ACTIVE_DAYS
 *                          supaya streak lama tidak berubah saat admin mengganti
 *                          hari aktif. Kalau null, activeDays berlaku sejak dulu.
 *
 * Aturan:
 * - Hari yang BUKAN hari aktif dilewati begitu saja (tidak memutus streak).
 * - Hari ini (kalau hari aktif) boleh belum check-in tanpa memutus
 *   streak dari hari-hari sebelumnya (grace period sampai hari berakhir).
 * - Begitu ketemu hari aktif *lampau* yang tidak ada check-in-nya,
 *   streak berhenti di situ.
 */
export function computeWeekdayStreak(
  checkedInDates: Set<string>,
  today: Date = new Date(),
  activeDays: ReadonlySet<number> = DEFAULT_ACTIVE_DAYS,
  activeDaysSince: string | null = null,
): { streak: number; missedDate: string | null } {
  let streak = 0;
  const cursor = new Date(today);
  const todayStr = toISODate(today);
  let toleratedToday = false;
  let missedDate: string | null = null;

  for (let i = 0; i < 3650; i++) {
    const dateStr = toISODate(cursor);
    const dow = cursor.getDay(); // 0 = Minggu, 6 = Sabtu

    // Tentukan hari aktif berdasarkan tanggal:
    // sebelum effective date → pakai default, sesudah → pakai setting baru
    const effectiveDays =
      activeDaysSince && dateStr < activeDaysSince
        ? DEFAULT_ACTIVE_DAYS
        : activeDays;

    if (checkedInDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    // Hari ini bukan hari aktif → lewati (tidak memutus streak)
    if (!effectiveDays.has(dow)) {
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

