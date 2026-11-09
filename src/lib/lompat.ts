// =====================================================
// Lompat Rintangan — logika bersama (solo & bareng)
//
// Lari otomatis ke kanan: rintangan 🌵 datang dari kanan, pemain melompat
// (tap / Spasi / ↑). Bintang ⭐ melayang di udara, diambil dengan melompat.
// Jadwal dibuat sekali (host) dan dimainkan ulang identik di semua klien.
// =====================================================

export const LOMPAT_TICK_MS = 40;
export const LOMPAT_MAX_TICKS = 1500; // 60 detik
export const LOMPAT_JUMP_TICKS = 22;
export const LOMPAT_SPEED = 2; // persen lebar arena per tick
export const LOMPAT_PLAYER_X = 15;
export const LOMPAT_FINISH_BONUS = 100;
export const LOMPAT_STAR_POINTS = 20;

/** [tick muncul, 1 = bintang / 0 = rintangan] */
export type LompatSpawn = readonly [number, number];

export interface LompatItem {
  id: number;
  x: number;
  star: boolean;
}

/** Tinggi lompatan 0..1 (j < 0 = di tanah). */
export function lompatHeight(j: number): number {
  return j < 0 ? 0 : Math.sin((Math.PI * j) / LOMPAT_JUMP_TICKS);
}

export function buildLompatSchedule(): LompatSpawn[] {
  const out: Array<[number, number]> = [];
  let t = 30;
  while (t < LOMPAT_MAX_TICKS) {
    out.push([t, 0]);
    const gap = Math.max(22, 46 - Math.floor(t / 60)) + Math.floor(Math.random() * 10);
    if (gap >= 34 && Math.random() < 0.4) out.push([t + Math.floor(gap / 2), 1]);
    t += gap;
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** Geser semua benda satu tick lalu deteksi tabrakan / bintang yang terambil. */
export function stepLompat(items: LompatItem[], height: number): { items: LompatItem[]; hit: boolean; stars: number } {
  let hit = false;
  let stars = 0;
  const next = items
    .map((it) => ({ ...it, x: it.x - LOMPAT_SPEED }))
    .filter((it) => {
      const near = Math.abs(it.x - LOMPAT_PLAYER_X) < 6;
      if (near) {
        if (it.star) {
          if (height > 0.5) {
            stars += 1;
            return false;
          }
        } else if (height < 0.4) {
          hit = true;
        }
      }
      return it.x > -10;
    });
  return { items: next, hit, stars };
}

export const lompatScore = (ticks: number, stars: number) => Math.floor(ticks / 10) + stars * LOMPAT_STAR_POINTS;
