// =====================================================
// Multiplayer minigame — tipe pesan, pembuat soal, dan skor
//
// Tanpa tabel database: ruangan = channel Supabase Realtime
// (Presence untuk daftar pemain, Broadcast untuk pesan permainan).
// Host (pemain yang masuk paling awal) membuat soal & mengatur giliran;
// semua klien menghitung skor dari data yang sama supaya hasilnya seragam.
// =====================================================

import {
  CATEGORY_LABEL,
  deadlinePool,
  shuffle,
  type GameTicket,
} from "@/lib/minigame";

export type MpMode =
  | "quiz"
  | "rebutan"
  | "survival"
  | "race"
  | "whack"
  | "hitung"
  | "trivia"
  | "memory"
  | "reflex"
  | "lari"
  | "kata"
  | "simon"
  | "warna"
  | "angka"
  | "beda"
  | "besar"
  | "gambar"
  | "sandi"
  | "labirin"
  | "dua4"
  | "slither";

/** tiket = memakai data tiket tim; umum = bisa dimainkan tanpa data apa pun. */
export type MpModeGroup = "tiket" | "umum";

export interface MpModeConfig {
  group: MpModeGroup;
  label: string;
  emoji: string;
  tagline: string;
  rules: string[];
  minPlayers: number;
}

export const MP_MODES: Record<MpMode, MpModeConfig> = {
  slither: {
    group: "umum",
    label: "Slither Arena",
    emoji: "🐍",
    tagline: "Arena ular real-time ala slither.io. Makan, tumbuh, dan jebak lawan!",
    rules: [
      "Arahkan ular dengan mouse/jari. Tahan Spasi atau tombol ⚡ untuk ngebut (ekor memendek).",
      "Makan pelet = ular memanjang & +10 poin. Pelet besar bernilai lebih.",
      "Kepalamu menabrak badan lawan = kamu mati (bisa respawn). Lawan yang menabrak badanmu = +100 untukmu.",
      "Waktu 120 detik, skor tertinggi menang. Dinding arena tidak mematikan.",
    ],
    minPlayers: 2,
  },
  sandi: {
    group: "umum",
    label: "Sandi Rahasia",
    emoji: "🔐",
    tagline: "Pecahkan sandi 4 warna dari petunjuk. Siapa paling jeli dan hemat percobaan?",
    rules: [
      "3 sandi (4 warna, boleh berulang), 180 detik total, maks 10 tebakan per sandi.",
      "● = warna & posisi pas, ○ = warna ada tapi posisi salah.",
      "Sandi sama untuk semua pemain. Makin sedikit tebakan & makin cepat, makin besar poin.",
    ],
    minPlayers: 2,
  },
  labirin: {
    group: "umum",
    label: "Labirin Kilat",
    emoji: "🧭",
    tagline: "Cari jalan keluar dari labirin gelap. Kamu hanya melihat sekitar dirimu!",
    rules: [
      "Labirin 15x15 yang sama untuk semua, 90 detik. Gerak dengan panah / WASD / tombol arah.",
      "Kabut menutupi labirin — area yang sudah dijelajahi tetap terlihat.",
      "Sampai finish = 400 + bonus waktu. Belum sampai = poin sesuai kedekatan dengan finish.",
    ],
    minPlayers: 2,
  },
  dua4: {
    group: "umum",
    label: "Hitung 24",
    emoji: "🎯",
    tagline: "Susun 4 angka dengan + − × ÷ dan kurung sampai hasilnya tepat 24!",
    rules: [
      "6 soal (4 angka 1-9, dijamin ada jawabannya), 150 detik total.",
      "Pakai tiap angka tepat satu kali. Soal sama untuk semua pemain.",
      "Benar = 150 + bonus kecepatan (maks +100). Boleh lewati soal yang buntu.",
    ],
    minPlayers: 2,
  },
  gambar: {
    group: "umum",
    label: "Tebak Gambar",
    emoji: "🎨",
    tagline: "Satu orang menggambar kata rahasia, yang lain menebak. Gantian jadi tukang gambar!",
    rules: [
      "Jumlah ronde = jumlah pemain x 2, tukang gambar bergiliran tiap ronde.",
      "Tukang gambar dapat kata rahasia dan menggambarnya (dilarang menulis huruf!). Waktu 60 detik.",
      "Penebak mengetik tebakan di kolom jawaban. Benar lebih cepat = poin lebih besar.",
      "Tukang gambar dapat poin dari tiap penebak yang berhasil, bonus kalau semua berhasil.",
    ],
    minPlayers: 2,
  },
  beda: {
    group: "umum",
    label: "Cari Beda",
    emoji: "🔍",
    tagline: "Temukan emoji yang beda sendiri. Papan sama untuk semua pemain!",
    rules: [
      "30 detik, papan makin besar tiap beberapa soal.",
      "Tap emoji yang beda. Benar +10, salah -5.",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  besar: {
    group: "umum",
    label: "Lebih Besar",
    emoji: "⚖️",
    tagline: "Mana yang nilainya lebih besar? Soal sama untuk semua, adu cepat!",
    rules: [
      "30 detik, dari angka biasa sampai hitungan campur.",
      "Tap sisi dengan nilai lebih besar. Benar +10, salah -5.",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  warna: {
    group: "umum",
    label: "Warna Mengecoh",
    emoji: "🌈",
    tagline: "Tap warna TINTA kata, bukan tulisannya. Awas tertipu!",
    rules: [
      "30 detik, urutan kata & warna sama untuk semua pemain.",
      "Benar +10, salah -5. Skor semua pemain terlihat langsung.",
      "Makin cepat tap, makin banyak soal yang terjawab.",
    ],
    minPlayers: 2,
  },
  angka: {
    group: "umum",
    label: "Sentuh Angka",
    emoji: "🔢",
    tagline: "Tap angka 1-16 berurutan. Papan sama untuk semua, siapa paling cepat?",
    rules: [
      "16 angka teracak (sama untuk semua pemain), batas 45 detik.",
      "Tap berurutan mulai dari 1. Tiap angka benar +20.",
      "Selesai semua = bonus sisa waktu (maks +400).",
    ],
    minPlayers: 2,
  },
  lari: {
    group: "umum",
    label: "Lomba Lari",
    emoji: "🏃",
    tagline: "Siapa yang paling cepat sampai garis finish? Gantian kiri-kanan secepat kilat!",
    rules: [
      "Tap tombol KIRI dan KANAN bergantian (keyboard: F dan J, atau ← dan →).",
      "Tap sisi yang sama dua kali = tersandung, tidak maju.",
      "Yang sampai finish duluan menang, makin cepat bonus makin besar. Batas 30 detik.",
    ],
    minPlayers: 2,
  },
  kata: {
    group: "umum",
    label: "Acak Kata",
    emoji: "🔤",
    tagline: "Huruf diacak, tebak kata aslinya. Otak IT vs otak kantoran!",
    rules: [
      "10 kata acak (istilah kerja & IT), 15 detik per soal.",
      "Pilih kata aslinya dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  simon: {
    group: "umum",
    label: "Pola Ajaib",
    emoji: "🎨",
    tagline: "Hafalkan urutan warna yang menyala, ulangi tanpa salah. Makin lama makin panjang!",
    rules: [
      "Perhatikan urutan pad yang menyala, lalu ulangi persis.",
      "Tiap level urutan bertambah satu. Pola sama untuk semua pemain.",
      "Salah atau kehabisan waktu = selesai. Skor = level yang lolos x 100.",
    ],
    minPlayers: 2,
  },
  hitung: {
    group: "umum",
    label: "Hitung Kilat",
    emoji: "🧮",
    tagline: "Adu hitung di kepala. Otak siapa yang paling ngebut?",
    rules: [
      "12 soal hitung dari mudah ke susah, 15 detik per soal.",
      "Semua pemain dapat soal yang sama di waktu yang sama.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  trivia: {
    group: "umum",
    label: "Trivia Seru",
    emoji: "🧠",
    tagline: "Pengetahuan umum, teknologi, dan tebak emoji film. Tidak ada hubungannya dengan tiket!",
    rules: [
      "10 soal campur: pengetahuan umum dan tebak emoji.",
      "Benar = 100 + bonus kecepatan (maks +100).",
      "Yang paling cepat dan paling tahu yang menang.",
    ],
    minPlayers: 2,
  },
  memory: {
    group: "umum",
    label: "Memori Kilat",
    emoji: "🃏",
    tagline: "Cocokkan pasangan kartu. Susunan kartu sama untuk semua pemain!",
    rules: [
      "16 kartu (8 pasang), 60 detik.",
      "Pasangan cocok +100, beruntun menambah bonus. Salah -10.",
      "Selesai lebih cepat = bonus sisa waktu.",
    ],
    minPlayers: 2,
  },
  reflex: {
    group: "umum",
    label: "Refleks Kilat",
    emoji: "🚦",
    tagline: "Tunggu layar hijau lalu tap secepat kilat. Awas kepagian!",
    rules: [
      "6 ronde. Tunggu layar berubah hijau, baru tap.",
      "Poin = 1000 dikurangi waktu reaksimu (ms).",
      "Tap sebelum hijau = 0 poin untuk ronde itu.",
    ],
    minPlayers: 2,
  },
  quiz: {
    group: "tiket",
    label: "Kuis Kilat",
    emoji: "⚡",
    tagline: "Soal campur dari tiket asli. Siapa paling cepat dan paling tahu?",
    rules: [
      "10 soal: tebak pemilik, kategori, atau deadline tiket.",
      "Semua pemain dapat soal yang sama di waktu yang sama.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  rebutan: {
    group: "tiket",
    label: "Rebutan",
    emoji: "🏴‍☠️",
    tagline: "Soal sama seperti kuis, tapi poin ditentukan urutan jawab benar.",
    rules: [
      "10 soal, 15 detik per soal.",
      "Benar tercepat +150, kedua +100, ketiga +70, sisanya +40.",
      "Salah atau tidak menjawab = 0. Jangan asal tap!",
    ],
    minPlayers: 2,
  },
  survival: {
    group: "tiket",
    label: "Survival",
    emoji: "💀",
    tagline: "Satu salah, langsung gugur. Siapa penyintas terakhir di tim?",
    rules: [
      "Soal sama seperti kuis, 15 detik per soal.",
      "Jawaban salah atau telat = tereliminasi (tetap bisa menonton).",
      "Penyintas dapat poin tiap ronde, lebih cepat lebih besar.",
      "Penyintas terakhir dapat bonus +200. Bisa selesai sebelum soal habis!",
    ],
    minPlayers: 2,
  },
  whack: {
    group: "tiket",
    label: "Gebuk Bareng",
    emoji: "🔨",
    tagline: "Tiket yang sama muncul untuk semua. Siapa paling jago menggebuk?",
    rules: [
      "30 detik, jadwal tiket muncul persis sama untuk semua pemain.",
      "Prioritas tinggi = poin besar, ✨ tiket emas +10, 💣 bom -5.",
      "Tiket kabur memutus kombo. Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  race: {
    group: "tiket",
    label: "Balapan Ketik",
    emoji: "🏎️",
    tagline: "Ketik ID tiket secepat mungkin. Posisi semua pemain terlihat langsung!",
    rules: [
      "45 detik, semua pemain dapat urutan tiket yang sama.",
      "Ketik ID tiket (misal MST-042) — otomatis lanjut kalau benar.",
      "Benar = +100, kombo menambah bonus. Salah mereset kombo.",
    ],
    minPlayers: 2,
  },
};

export const MP_MODE_KEYS: MpMode[] = [
  "quiz",
  "rebutan",
  "survival",
  "whack",
  "race",
  "hitung",
  "trivia",
  "memory",
  "reflex",
  "lari",
  "kata",
  "simon",
  "warna",
  "angka",
  "beda",
  "besar",
  "gambar",
  "sandi",
  "labirin",
  "dua4",
  "slither",
];

export const ROUND_MS = 15_000;
export const RACE_SECONDS = 45;
export const MP_ROUNDS = 10;
export const DRAW_SECONDS = 60;

// ─── Soal ────────────────────────────────────────────

export type QuestionKind = "owner" | "category" | "deadline" | "math" | "trivia" | "emoji" | "scramble";

export interface MpQuestion {
  kind: QuestionKind;
  /** Judul soal. */
  prompt: string;
  /** Info tambahan (kode tiket, deadline, dsb). */
  hint: string;
  options: string[];
  /** Indeks jawaban benar di options. */
  answer: number;
}

const KIND_TITLE: Record<QuestionKind, string> = {
  owner: "🕵️ Siapa pemegang tiket ini?",
  category: "💡 Apa kategori tiket ini?",
  deadline: "⚡ Deadline tiket ini…",
  math: "🧮 Hitung cepat!",
  trivia: "🧠 Trivia",
  emoji: "🎬 Tebak emoji",
  scramble: "🔤 Susun huruf ini jadi kata",
};

export const kindTitle = (k: QuestionKind) => KIND_TITLE[k];

const todayIso = () => new Date().toISOString().slice(0, 10);

function make(kind: QuestionKind, t: GameTicket, hint: string, options: string[], answerLabel: string): MpQuestion {
  return { kind, prompt: t.subject, hint, options, answer: options.indexOf(answerLabel) };
}

export function buildMpQuestions(tickets: GameTicket[], names: string[]): MpQuestion[] {
  const out: MpQuestion[] = [];
  const nameList = Array.from(new Set(names.filter(Boolean)));

  const owners = shuffle(tickets.filter((t) => t.assigneeName));
  if (nameList.length >= 2) {
    for (const t of owners.slice(0, 4)) {
      const answer = t.assigneeName as string;
      const options = shuffle([answer, ...shuffle(nameList.filter((n) => n !== answer)).slice(0, 3)]);
      out.push(make("owner", t, t.ticket_id, options, answer));
    }
  }

  const cats = Array.from(new Set(tickets.map((t) => t.category).filter((c) => CATEGORY_LABEL[c])));
  if (cats.length >= 3) {
    for (const t of shuffle(tickets.filter((t) => CATEGORY_LABEL[t.category])).slice(0, 3)) {
      const answer = CATEGORY_LABEL[t.category];
      const options = shuffle([answer, ...shuffle(cats.filter((c) => c !== t.category)).slice(0, 3).map((c) => CATEGORY_LABEL[c])]);
      out.push(make("category", t, t.ticket_id, options, answer));
    }
  }

  const today = todayIso();
  for (const t of shuffle(deadlinePool(tickets)).slice(0, 3)) {
    const late = (t.due_date as string) < today;
    out.push(make("deadline", t, `${t.ticket_id} · deadline ${t.due_date} · hari ini ${today}`, ["Sudah telat", "Masih aman"], late ? "Sudah telat" : "Masih aman"));
  }

  return shuffle(out).slice(0, MP_ROUNDS);
}

export function canPlayMp(tickets: GameTicket[], names: string[]): boolean {
  return buildMpQuestions(tickets, names).length >= 5;
}

// ─── Skor ────────────────────────────────────────────

export interface RoundAnswer {
  /** Indeks pilihan. */
  c: number;
  /** Milidetik sejak soal tampil (menurut pemain itu). */
  ms: number;
}
export type RoundAnswers = Record<string, RoundAnswer>;

const RANK_POINTS = [150, 100, 70];

/** Poin tiap pemain untuk satu ronde — dipanggil identik di semua klien. */
export function scoreRound(q: MpQuestion, answers: RoundAnswers, mode: MpMode): Record<string, number> {
  const correct = Object.entries(answers)
    .filter(([, a]) => a.c === q.answer)
    .sort((a, b) => a[1].ms - b[1].ms || a[0].localeCompare(b[0]));
  const pts: Record<string, number> = {};
  correct.forEach(([id, a], rank) => {
    pts[id] =
      mode === "rebutan" || mode === "survival"
        ? (RANK_POINTS[rank] ?? 40)
        : 100 + Math.round(Math.max(0, 1 - a.ms / ROUND_MS) * 100);
  });
  return pts;
}

// ─── Tebak Gambar ────────────────────────────────────

/**
 * Poin satu ronde. `hits` = penebak yang benar (ms = waktu tebak).
 * Penebak: 100 + bonus kecepatan. Tukang gambar: 50 per penebak, +50 kalau semua berhasil.
 */
export function scoreDraw(drawerId: string, hits: RoundAnswers, guesserIds: string[]): Record<string, number> {
  const pts: Record<string, number> = {};
  let n = 0;
  for (const id of guesserIds) {
    const h = hits[id];
    if (!h) continue;
    n++;
    pts[id] = 100 + Math.round(Math.max(0, 1 - h.ms / (DRAW_SECONDS * 1000)) * 100);
  }
  if (n > 0) pts[drawerId] = n * 50 + (n === guesserIds.length ? 50 : 0);
  return pts;
}

// ─── Balapan ketik ───────────────────────────────────

export interface RaceTicket {
  ticket_id: string;
  subject: string;
  priority: GameTicket["priority"];
}

export function buildRaceQueue(tickets: GameTicket[]): RaceTicket[] {
  const pool = shuffle(tickets.filter((t) => t.ticket_id));
  const repeats = Math.ceil(120 / Math.max(pool.length, 1));
  return Array.from({ length: repeats }, () => shuffle(pool))
    .flat()
    .slice(0, 120)
    .map((t) => ({ ticket_id: t.ticket_id, subject: t.subject, priority: t.priority }));
}

export function canPlayRace(tickets: GameTicket[]): boolean {
  return tickets.filter((t) => t.ticket_id).length >= 5;
}

// ─── Gebuk bareng ────────────────────────────────────

export const WHACK_SECONDS = 30;
export const WHACK_HOLES = 9;

export interface WhackSpawn {
  /** Muncul pada ms ke-N sejak mulai. */
  at: number;
  /** Lama tampil (ms). */
  life: number;
  slot: number;
  kind: "ticket" | "bomb" | "gold";
  ticket_id: string;
  subject: string;
  priority: GameTicket["priority"];
}

/** Jadwal kemunculan deterministik: dibuat host, diputar ulang di semua klien. */
export function buildWhackSchedule(tickets: GameTicket[]): WhackSpawn[] {
  const pool = tickets.filter((t) => t.ticket_id);
  const busyUntil = Array<number>(WHACK_HOLES).fill(-1);
  const out: WhackSpawn[] = [];
  let at = 700;
  while (at < WHACK_SECONDS * 1000 - 600) {
    const sec = at / 1000;
    const life = Math.max(850, Math.round(1700 - sec * 25));
    const free = busyUntil.flatMap((end, i) => (end <= at ? [i] : []));
    if (free.length > 0) {
      const slot = free[Math.floor(Math.random() * free.length)];
      const t = pool[Math.floor(Math.random() * pool.length)];
      const r = Math.random();
      const kind: WhackSpawn["kind"] = r < 0.12 ? "bomb" : r < 0.2 ? "gold" : "ticket";
      out.push({ at, life, slot, kind, ticket_id: t.ticket_id, subject: t.subject, priority: t.priority });
      busyUntil[slot] = at + life + 100;
    }
    at += Math.max(220, Math.round(520 - sec * 8)) + Math.floor(Math.random() * 120);
  }
  return out;
}

export function canPlayWhack(tickets: GameTicket[]): boolean {
  return tickets.filter((t) => t.ticket_id).length >= 3;
}

// ─── Pesan & pemain ──────────────────────────────────

export interface MpPlayer {
  id: string;
  name: string;
}

export interface StartPayload {
  mode: MpMode;
  hostId: string;
  players: MpPlayer[];
  questions?: MpQuestion[];
  queue?: RaceTicket[];
  schedule?: WhackSpawn[];
  /** Susunan kartu Memori Kilat. */
  deck?: string[];
  /** Jeda tunggu tiap ronde Refleks Kilat (ms). */
  delays?: number[];
  /** Pola pad Pola Ajaib (0-3). */
  pattern?: number[];
  /** Urutan [kata, tinta] Warna Mengecoh. */
  stroop?: Array<readonly [number, number]>;
  /** Susunan angka 1..16 Sentuh Angka. */
  grid?: number[];
  /** Soal Cari Beda: [pasangan, sisi biasa, posisi si beda]. */
  beda?: Array<readonly [number, number, number]>;
  /** Soal Lebih Besar: [teks kiri, nilai kiri, teks kanan, nilai kanan]. */
  besar?: Array<readonly [string, number, string, number]>;
  /** Kata rahasia Tebak Gambar, satu per ronde (jumlah pemain x 2). */
  words?: string[];
  /** Sandi Rahasia: 3 sandi, tiap sandi 4 indeks warna. */
  codes?: number[][];
  /** Labirin Kilat: bitmask sisi terbuka tiap sel. */
  maze?: number[];
  /** Hitung 24: 4 angka per soal. */
  puzzles?: number[][];
  /** Slither Arena: seed untuk pelet awal yang sama di semua klien. */
  seed?: number;
  /** Pembeda antar permainan supaya komponen game selalu bersih. */
  nonce: number;
}

export type MpMessage =
  | ({ t: "start" } & StartPayload)
  | { t: "lobby" }
  | { t: "mode"; mode: MpMode }
  | { t: "round"; i: number }
  | { t: "ans"; i: number; id: string; c: number; ms: number }
  | { t: "reveal"; i: number; answers: RoundAnswers }
  | { t: "end" }
  | { t: "prog"; id: string; score: number; n: number; done?: boolean }
  /** Tebak Gambar: potongan goresan (koordinat 0-1000, x lalu y berselang-seling). */
  | { t: "stroke"; i: number; c: number; w: number; s: boolean; p: number[] }
  | { t: "clear"; i: number }
  | { t: "guess"; i: number; id: string; text: string }
  | { t: "hit"; i: number; id: string; ms: number }
  /** Slither Arena: posisi ular (seg = titik kepala lalu badan, x,y berselang-seling). */
  | { t: "snk"; id: string; a: number; b: boolean; len: number; seg: number[] }
  /** Pelet dimakan / ditambah / dijatuhkan ular mati: f = id atau [id,x,y,nilai] berulang. */
  | { t: "eat"; f: number[] }
  | { t: "food"; f: number[] }
  | { t: "dead"; id: string; by: string | null; f: number[] };

const AVATARS = ["🦊", "🐼", "🐸", "🦁", "🐙", "🦄", "🐯", "🐧", "🦉", "🐳", "🦖", "🐝"];

export function avatarFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATARS[Math.abs(h) % AVATARS.length];
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomRoomCode(): string {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
