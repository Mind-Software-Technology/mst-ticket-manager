// =====================================================
// Slither Arena — konstanta & helper murni (tanpa React)
//
// Tanpa server game: tiap klien mensimulasikan ularnya sendiri dan
// menyiarkan posisinya ±8x/detik. Pelet awal dibuat dari seed yang sama
// di semua klien; pelet baru disiarkan host, pelet ular mati disiarkan
// pemiliknya, dan pelet yang dimakan disiarkan pemakannya.
// =====================================================

export const SLITHER_SECONDS = 120;
export const WORLD = 1800;
export const VIEW_W = 640;
export const VIEW_H = 400;
export const BASE_SPEED = 140;
export const BOOST_SPEED = 250;
export const TURN_RATE = 4;
export const SPACING = 9;
export const START_LEN = 10;
export const MAX_LEN = 220;
export const MIN_BOOST_LEN = 12;
export const SEG_SEND_STEP = 3;
export const SEND_MS = 125;
export const FOOD_TARGET = 240;
export const KILL_POINTS = 100;
export const PELLET_POINTS = 10;

export interface Pellet {
  x: number;
  y: number;
  v: number;
}

/** PRNG deterministik: seed sama → urutan sama di semua klien. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedPellets(seed: number, count = 180): Map<number, Pellet> {
  const rnd = mulberry32(seed);
  const map = new Map<number, Pellet>();
  for (let id = 0; id < count; id++) {
    map.set(id, { x: 40 + rnd() * (WORLD - 80), y: 40 + rnd() * (WORLD - 80), v: rnd() < 0.12 ? 3 : 1 });
  }
  return map;
}

/** Warna stabil dari id pemain atau pelet. */
export function hueOf(key: string | number): number {
  if (typeof key === "number") return (key * 47) % 360;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export const snakeRadius = (len: number) => 6 + Math.min(len, MAX_LEN) / 40;

/** Jarak titik (px,py) ke ruas garis (ax,ay)-(bx,by). */
export function pointSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Selisih sudut terpendek a→b dalam rentang (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Badan mengikuti kepala: tiap ruas menjaga jarak SPACING dari ruas di depannya. Array datar [x0,y0,x1,y1,…]. */
export function followBody(segs: number[]) {
  for (let i = 2; i < segs.length; i += 2) {
    const dx = segs[i - 2] - segs[i];
    const dy = segs[i - 1] - segs[i + 1];
    const d = Math.hypot(dx, dy);
    if (d > SPACING) {
      const k = (d - SPACING) / d;
      segs[i] += dx * k;
      segs[i + 1] += dy * k;
    }
  }
}

/** Kirim kepala + tiap ruas ke-3 + ekor, dibulatkan, supaya pesan tetap kecil. */
export function packBody(segs: number[]): number[] {
  const out: number[] = [];
  const n = segs.length / 2;
  for (let i = 0; i < n; i += SEG_SEND_STEP) out.push(Math.round(segs[i * 2]), Math.round(segs[i * 2 + 1]));
  if ((n - 1) % SEG_SEND_STEP !== 0) out.push(Math.round(segs[(n - 1) * 2]), Math.round(segs[(n - 1) * 2 + 1]));
  return out;
}
