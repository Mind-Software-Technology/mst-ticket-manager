// =====================================================
// Ritme Tap — logika bersama (solo & bareng)
//
// 4 jalur, nada jatuh dari atas. Tap jalur saat nada tepat di garis.
// Chart dibuat sekali (host) dan dimainkan identik di semua klien.
// =====================================================

export const RITME_TICK_MS = 40;
export const RITME_MAX_TICKS = 1200; // 48 detik
export const RITME_SPEED = 1.8; // persen tinggi arena per tick
export const RITME_HIT_Y = 82;
export const RITME_GOOD_WINDOW = 12;
export const RITME_PERFECT_WINDOW = 4.5;
export const RITME_MISS_Y = RITME_HIT_Y + RITME_GOOD_WINDOW + 1;
export const RITME_LANES = 4;

/** [tick muncul, jalur 0-3] */
export type RitmeNote = readonly [number, number];

export interface RitmeFalling {
  id: number;
  lane: number;
  y: number;
}

export function buildRitmeChart(): RitmeNote[] {
  const out: Array<[number, number]> = [];
  let t = 20;
  let prev = -1;
  while (t < RITME_MAX_TICKS - 70) {
    let lane = Math.floor(Math.random() * RITME_LANES);
    if (lane === prev && Math.random() < 0.6) lane = (lane + 1 + Math.floor(Math.random() * 3)) % RITME_LANES;
    out.push([t, lane]);
    if (t > 200 && Math.random() < 0.15) out.push([t, (lane + 1 + Math.floor(Math.random() * 3)) % RITME_LANES]);
    prev = lane;
    t += Math.max(9, 18 - Math.floor(t / 150)) + Math.floor(Math.random() * 6);
  }
  return out;
}

/** Poin satu ketukan: 20 perfect, 10 bagus; bonus +5 kalau kombo >= 10. */
export function ritmePoints(distance: number, combo: number): number {
  return (distance <= RITME_PERFECT_WINDOW ? 20 : 10) + (combo >= 10 ? 5 : 0);
}
