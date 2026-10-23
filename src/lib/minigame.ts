// =====================================================
// Minigame — tipe, helper, dan rekor pribadi
//
// Semua soal/permainan dibangun dari tiket asli. Rekor disimpan di
// localStorage per user + per game (hanya kenyamanan pribadi, tidak
// dibagikan ke tim).
// =====================================================

import type { TicketCategory, TicketPriority, TicketState } from "@/types";

export type GameKey =
  | "quiz"
  | "deadline"
  | "whack"
  | "priority_sort"
  | "category_guess"
  | "speed_type"
  | "hitung"
  | "trivia"
  | "kata"
  | "memory"
  | "reflex"
  | "lari"
  | "simon"
  | "warna"
  | "angka"
  | "beda"
  | "besar";

export interface GameTicket {
  id: string;
  ticket_id: string;
  subject: string;
  state: TicketState;
  priority: TicketPriority;
  due_date: string | null;
  category: string;
  productName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

export interface GameConfig {
  /** tiket = soal dari tiket asli; umum = tanpa data tiket. */
  group: "tiket" | "umum";
  label: string;
  emoji: string;
  tagline: string;
  rules: string[];
  /** Syarat minimal data tiket (ditampilkan kalau belum cukup). */
  needs: string;
}

export const GAMES: Record<GameKey, GameConfig> = {
  quiz: {
    group: "tiket",
    label: "Tebak Pemilik",
    emoji: "🕵️",
    tagline: "Siapa yang pegang tiket ini? Uji seberapa kenal kamu sama kerjaan tim.",
    rules: [
      "10 soal, tiap soal 12 detik.",
      "Pilih nama assignee yang benar dari 4 pilihan.",
      "Makin cepat dan makin panjang kombo, makin besar poinnya.",
    ],
    needs: "Butuh minimal 5 tiket yang sudah punya assignee dan 2 nama berbeda.",
  },
  deadline: {
    group: "tiket",
    label: "Telat atau Aman?",
    emoji: "⚡",
    tagline: "Tebak cepat: deadline tiket ini sudah lewat atau masih aman?",
    rules: [
      "30 detik, tap secepat mungkin.",
      "Benar +10 (bonus tiap 5 kombo), salah -5 dan kombo hangus.",
      "Bandingkan tanggal deadline dengan tanggal hari ini.",
    ],
    needs: "Butuh minimal 5 tiket aktif yang punya deadline.",
  },
  whack: {
    group: "tiket",
    label: "Gebuk Tiket",
    emoji: "🎯",
    tagline: "Tiket bermunculan dari lubang. Gebuk sebelum kabur — tapi awas Deploy Jumat!",
    rules: [
      "30 detik, tap tiket yang muncul.",
      "Prioritas tinggi = poin lebih besar (Critical +5).",
      "Jangan kena 💣 Deploy Jumat Sore: -5 dan kombo hangus.",
    ],
    needs: "Butuh minimal 3 tiket.",
  },
  priority_sort: {
    group: "tiket",
    label: "Susun Prioritas",
    emoji: "🧩",
    tagline: "Urutkan tiket dari prioritas tertinggi ke terendah secepat mungkin!",
    rules: [
      "8 ronde, tiap ronde 5 tiket diacak.",
      "Tap tiket dari prioritas tertinggi (Critical) ke terendah (Low).",
      "Benar = +50 + bonus kecepatan. Salah = -20 dan nyawa berkurang.",
      "3 nyawa — habis = game over!",
    ],
    needs: "Butuh minimal 5 tiket dengan prioritas berbeda.",
  },
  category_guess: {
    group: "tiket",
    label: "Tebak Kategori",
    emoji: "💡",
    tagline: "Baca judul tiketnya, tebak kategorinya! Seberapa hapal kamu?",
    rules: [
      "10 soal, tiap soal 15 detik.",
      "Pilih kategori yang benar dari 4 pilihan.",
      "Benar +100 + bonus kecepatan + kombo. Salah = kombo hangus.",
    ],
    needs: "Butuh minimal 5 tiket dari 3 kategori berbeda.",
  },
  speed_type: {
    group: "tiket",
    label: "Ketik Cepat",
    emoji: "⌨️",
    tagline: "Tiket muncul — ketik ID-nya sebelum waktu habis! Uji kecepatan jarimu.",
    rules: [
      "45 detik, tiket muncul satu per satu.",
      "Ketik kode tiket (misal MST-042) lalu Enter.",
      "Benar = +80 + bonus kecepatan. Typo = skip, tidak ada penalti.",
      "Makin lama makin cepat waktu per tiketnya!",
    ],
    needs: "Butuh minimal 5 tiket.",
  },
  hitung: {
    group: "umum",
    label: "Hitung Kilat",
    emoji: "🧮",
    tagline: "Hitung di kepala secepat mungkin. Makin lama makin susah!",
    rules: [
      "12 soal hitung, tiap soal 15 detik.",
      "Benar = 100 + bonus kecepatan + kombo.",
      "Salah atau telat = kombo hangus.",
    ],
    needs: "",
  },
  trivia: {
    group: "umum",
    label: "Trivia Seru",
    emoji: "🧠",
    tagline: "Pengetahuan umum, teknologi, dan tebak emoji. Seberapa luas wawasanmu?",
    rules: ["10 soal campur, tiap soal 15 detik.", "Benar = 100 + bonus kecepatan + kombo.", "Salah = kombo hangus."],
    needs: "",
  },
  kata: {
    group: "umum",
    label: "Acak Kata",
    emoji: "🔤",
    tagline: "Huruf diacak, tebak kata aslinya dari istilah kerja & IT.",
    rules: ["10 kata acak, tiap soal 15 detik.", "Pilih kata aslinya dari 4 pilihan.", "Benar = 100 + bonus kecepatan + kombo."],
    needs: "",
  },
  memory: {
    group: "umum",
    label: "Memori Kilat",
    emoji: "🃏",
    tagline: "Cocokkan semua pasangan kartu secepat mungkin.",
    rules: [
      "16 kartu (8 pasang), 60 detik.",
      "Cocok +100, beruntun menambah bonus. Salah -10.",
      "Selesai lebih cepat = bonus sisa waktu.",
    ],
    needs: "",
  },
  reflex: {
    group: "umum",
    label: "Refleks Kilat",
    emoji: "🚦",
    tagline: "Tunggu layar hijau lalu tap secepat kilat. Awas kepagian!",
    rules: ["6 ronde, tunggu layar berubah hijau.", "Poin = 1000 dikurangi waktu reaksi (ms).", "Tap sebelum hijau = 0 poin."],
    needs: "",
  },
  lari: {
    group: "umum",
    label: "Lari Cepat",
    emoji: "🏃",
    tagline: "Tap kiri-kanan bergantian, lari sejauh mungkin dalam 20 detik!",
    rules: [
      "Tap KIRI dan KANAN bergantian (keyboard: F dan J, atau ← →).",
      "Tiap langkah benar +10. Sisi sama dua kali = tersandung -5 dan kombo hangus.",
      "20 detik. Makin panjang kombo, makin besar bonus langkah.",
    ],
    needs: "",
  },
  simon: {
    group: "umum",
    label: "Pola Ajaib",
    emoji: "🎨",
    tagline: "Hafalkan urutan warna yang menyala lalu ulangi. Seberapa panjang ingatanmu?",
    rules: [
      "Perhatikan urutan pad yang menyala, lalu ulangi persis.",
      "Tiap level urutan bertambah satu. Salah = selesai.",
      "Skor = level yang lolos x 100.",
    ],
    needs: "",
  },
  warna: {
    group: "umum",
    label: "Warna Mengecoh",
    emoji: "🌈",
    tagline: "Tulisannya satu warna, tintanya warna lain. Tap warna TINTA-nya, bukan tulisannya!",
    rules: [
      "30 detik, satu kata warna muncul bergantian.",
      "Tap warna tinta kata itu (bukan arti tulisannya).",
      "Benar +10 (bonus kombo), salah -5 dan kombo hangus.",
    ],
    needs: "",
  },
  angka: {
    group: "umum",
    label: "Sentuh Angka",
    emoji: "🔢",
    tagline: "Tap angka 1 sampai 16 secara berurutan secepat mungkin!",
    rules: [
      "16 angka teracak di papan, batas 45 detik.",
      "Tap berurutan mulai dari 1. Salah urutan tidak dihitung.",
      "Tiap angka benar +20, selesai semua dapat bonus sisa waktu (maks +400).",
    ],
    needs: "",
  },
  beda: {
    group: "umum",
    label: "Cari Beda",
    emoji: "🔍",
    tagline: "Satu emoji di papan sedikit berbeda dari yang lain. Temukan secepat mungkin!",
    rules: [
      "30 detik, papan makin besar tiap beberapa soal (3x3 sampai 6x6).",
      "Tap emoji yang beda sendiri.",
      "Benar +10 (bonus kombo), salah -5 dan kombo hangus.",
    ],
    needs: "",
  },
  besar: {
    group: "umum",
    label: "Lebih Besar",
    emoji: "⚖️",
    tagline: "Dua angka atau hitungan, mana yang nilainya lebih besar? Putuskan dalam sekejap!",
    rules: [
      "30 detik, dari angka biasa sampai hitungan tambah, kali, kurang.",
      "Tap sisi yang nilainya lebih besar (keyboard: F kiri, J kanan, atau ← →).",
      "Benar +10 (bonus kombo), salah -5 dan kombo hangus.",
    ],
    needs: "",
  },
};

export const GAME_KEYS: GameKey[] = [
  "quiz",
  "deadline",
  "whack",
  "priority_sort",
  "category_guess",
  "speed_type",
  "hitung",
  "trivia",
  "kata",
  "memory",
  "reflex",
  "lari",
  "simon",
  "warna",
  "angka",
  "beda",
  "besar",
];

export function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Soal Tebak Pemilik ──────────────────────────────

export interface QuizQuestion {
  ticket: GameTicket;
  options: string[];
  answer: string;
}

export const QUIZ_ROUNDS = 10;

export function buildQuiz(tickets: GameTicket[], allNames: string[]): QuizQuestion[] {
  const pool = shuffle(tickets.filter((t) => t.assigneeName));
  const names = Array.from(new Set(allNames.filter(Boolean)));
  return pool.slice(0, QUIZ_ROUNDS).map((ticket) => {
    const answer = ticket.assigneeName as string;
    const distractors = shuffle(names.filter((n) => n !== answer)).slice(0, 3);
    return { ticket, answer, options: shuffle([answer, ...distractors]) };
  });
}

export function canPlayQuiz(tickets: GameTicket[], allNames: string[]): boolean {
  return tickets.filter((t) => t.assigneeName).length >= 5 && new Set(allNames).size >= 2;
}

// ─── Telat atau Aman ─────────────────────────────────

const OPEN_STATES: TicketState[] = [
  "todo",
  "need_fix",
  "on_progress",
  "code_review",
  "ready_for_qa",
  "in_qa",
  "ready_to_deploy",
];

export function deadlinePool(tickets: GameTicket[]): GameTicket[] {
  return tickets.filter((t) => t.due_date && OPEN_STATES.includes(t.state));
}

// ─── Gebuk Tiket ─────────────────────────────────────

export const WHACK_POINTS: Record<TicketPriority, number> = {
  critical: 5,
  high: 3,
  normal: 2,
  low: 1,
};

export const PRIORITY_DOT: Record<TicketPriority, string> = {
  critical: "🔴",
  high: "🟠",
  normal: "🔵",
  low: "⚪",
};

// ─── Susun Prioritas ────────────────────────────────

export const PRIORITY_ORDER: Record<TicketPriority, number> = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export const SORT_ROUNDS = 8;
export const SORT_HAND_SIZE = 5;

export interface SortRound {
  /** 5 tiket acak, belum diurutkan. */
  tickets: GameTicket[];
  /** Urutan jawaban yang benar (indeks ke array tickets, sudah terurut by priority lalu subject). */
  correctOrder: number[];
}

export function buildSortRounds(tickets: GameTicket[]): SortRound[] {
  const pool = shuffle(tickets);
  const rounds: SortRound[] = [];
  for (let r = 0; r < SORT_ROUNDS; r++) {
    const start = (r * SORT_HAND_SIZE) % pool.length;
    const hand: GameTicket[] = [];
    for (let i = 0; i < SORT_HAND_SIZE; i++) {
      hand.push(pool[(start + i) % pool.length]);
    }
    // Correct order: sort by priority level, then alphabetically by subject
    const indexed = hand.map((t, i) => ({ t, i }));
    indexed.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.t.priority];
      const pb = PRIORITY_ORDER[b.t.priority];
      if (pa !== pb) return pa - pb;
      return a.t.subject.localeCompare(b.t.subject);
    });
    rounds.push({ tickets: hand, correctOrder: indexed.map((x) => x.i) });
  }
  return rounds;
}

export function canPlaySort(tickets: GameTicket[]): boolean {
  const priorities = new Set(tickets.map((t) => t.priority));
  return tickets.length >= 5 && priorities.size >= 2;
}

// ─── Tebak Kategori ─────────────────────────────────

export interface CategoryQuestion {
  ticket: GameTicket;
  options: string[];
  answer: string;
}

export const CATEGORY_ROUNDS = 10;

/** Mapping dari category value ke label yang bersih. */
export const CATEGORY_LABEL: Record<string, string> = {
  service_support: "Service & Support",
  finance_sales: "Finance & Sales",
  development: "Development",
  infrastructure_operations: "Infra & Ops",
  qa_testing: "QA & Testing",
  coordination_management: "Koordinasi",
  design_ui_ux: "Design (UI/UX)",
  internal_learning: "Internal & Learning",
  marketing: "Marketing",
};

export function buildCategoryQuiz(tickets: GameTicket[]): CategoryQuestion[] {
  const pool = shuffle(tickets.filter((t) => t.category && CATEGORY_LABEL[t.category]));
  const allCategories = Array.from(new Set(pool.map((t) => t.category)));
  return pool.slice(0, CATEGORY_ROUNDS).map((ticket) => {
    const answer = CATEGORY_LABEL[ticket.category] ?? ticket.category;
    const distractors = shuffle(
      allCategories.filter((c) => c !== ticket.category).map((c) => CATEGORY_LABEL[c] ?? c),
    ).slice(0, 3);
    return { ticket, answer, options: shuffle([answer, ...distractors]) };
  });
}

export function canPlayCategory(tickets: GameTicket[]): boolean {
  const cats = new Set(tickets.filter((t) => t.category).map((t) => t.category));
  return tickets.filter((t) => t.category).length >= 5 && cats.size >= 3;
}

// ─── Ketik Cepat ────────────────────────────────────

export const SPEED_TYPE_DURATION = 45;

export function buildTypeQueue(tickets: GameTicket[]): GameTicket[] {
  // Shuffle dan buat queue besar supaya tidak habis
  const pool = shuffle(tickets.filter((t) => t.ticket_id));
  const repeats = Math.ceil(200 / Math.max(pool.length, 1));
  return Array.from({ length: repeats }, () => shuffle(pool)).flat();
}

export function canPlaySpeedType(tickets: GameTicket[]): boolean {
  return tickets.filter((t) => t.ticket_id).length >= 5;
}

// ─── Rekor pribadi ───────────────────────────────────

const bestKey = (userId: string, game: GameKey) => `mst-minigame-best:${userId}:${game}`;

export function loadBest(userId: string | undefined, game: GameKey): number {
  if (!userId) return 0;
  try {
    return Number(localStorage.getItem(bestKey(userId, game))) || 0;
  } catch {
    return 0;
  }
}

/** Simpan kalau lebih tinggi dari rekor; return true kalau rekor baru. */
export function saveBest(userId: string | undefined, game: GameKey, score: number): boolean {
  if (!userId || score <= loadBest(userId, game)) return false;
  try {
    localStorage.setItem(bestKey(userId, game), String(score));
  } catch {
    /* localStorage tidak tersedia — rekor tidak tersimpan */
  }
  return true;
}

export function resultMessage(game: GameKey, score: number): string {
  const tiers: Record<GameKey, Array<[number, string]>> = {
    quiz: [
      [900, "Kamu hafal seluruh isi Gawean. Seram. 🧠"],
      [600, "Tim sudah seperti keluarga buatmu. 👏"],
      [300, "Lumayan! Mungkin perlu lebih sering buka papan tiket. 👀"],
      [0, "Kamu dan tiket tim… belum kenalan, ya? 🙈"],
    ],
    deadline: [
      [200, "Mata elang pengawas deadline! 🦅"],
      [120, "Refleks kelas project manager. 💼"],
      [60, "Lumayan cepat, tinggal diasah. ⏱️"],
      [0, "Tenang, deadline pun tidak akan lari… (katanya). 🐌"],
    ],
    whack: [
      [120, "Legenda pemberantas tiket! 🏆"],
      [70, "Gebukanmu mematikan. 🔨"],
      [30, "Lumayan, backlog sedikit berkurang. 📉"],
      [0, "Tiketnya kabur semua. Besok lagi ya! 🏃"],
    ],
    priority_sort: [
      [600, "Manajer prioritas sejati! Tiket selalu teratur. 📋"],
      [400, "Insting prioritasmu tajam! 🎯"],
      [200, "Lumayan, tapi masih perlu latihan. 📊"],
      [0, "Prioritas masih bercampur aduk… coba lagi! 🔀"],
    ],
    category_guess: [
      [900, "Kamu tahu semua seluk-beluk tim! Ensiklopedia hidup. 📚"],
      [600, "Kategorisasimu rapi — PM yang bagus! 💼"],
      [300, "Lumayan! Mungkin perlu intip-intip papan tiket lebih sering. 🔍"],
      [0, "Kategori dan kamu… belum akrab, ya? 😅"],
    ],
    speed_type: [
      [800, "Jari-jari super! Keyboard bergetar. ⚡"],
      [500, "Ketikan cepat kelas developer senior. 💻"],
      [250, "Lumayan, tapi bisa lebih cepat! 🏃"],
      [0, "Pelan-pelan saja, tidak ada yang mengejar… 🐢"],
    ],
    hitung: [
      [1800, "Kalkulator berjalan! Otakmu overclock. 🧮"],
      [1200, "Hitunganmu tajam, akuntan bakal minder. 📊"],
      [600, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Kalkulator di HP-mu masih berguna kok. 📱"],
    ],
    trivia: [
      [1500, "Ensiklopedia berjalan! Jago banget. 📚"],
      [1000, "Wawasanmu luas, cocok jadi tim kuis. 🧠"],
      [500, "Lumayan! Rajin-rajin baca ya. 📰"],
      [0, "Googling dulu sebelum main lagi? 😅"],
    ],
    kata: [
      [1500, "Penyihir kata! Huruf acak pun ketahuan. 🔮"],
      [1000, "Mata jeli, kosa katamu mantap. 👀"],
      [500, "Lumayan, huruf-hurufnya masih suka menipu. 🌀"],
      [0, "Hurufnya kabur semua… coba lagi! 🔤"],
    ],
    memory: [
      [1400, "Ingatan fotografis! Kartu pun takluk. 📸"],
      [1000, "Memorimu tajam. 🧠"],
      [500, "Lumayan, kartunya masih suka ngumpet. 🃏"],
      [0, "Kartunya lebih licik dari dugaan. 🙈"],
    ],
    reflex: [
      [4800, "Refleks kelas pembalap F1! 🏎️"],
      [3800, "Jarimu secepat kilat. ⚡"],
      [2500, "Lumayan cepat, tinggal sedikit lagi. 🚦"],
      [0, "Pelan tapi pasti… mungkin kebanyakan ngantuk. 😴"],
    ],
    lari: [
      [1500, "Usain Bolt kantoran! Jari-jarimu ngebut. ⚡"],
      [1000, "Larimu kencang, napas masih aman. 🏃"],
      [600, "Lumayan, pemanasan yang bagus. 👟"],
      [0, "Jalan santai juga olahraga… 🚶"],
    ],
    simon: [
      [1500, "Ingatan tingkat dewa! Pola apa pun hafal. 🎹"],
      [1000, "Hafalanmu panjang banget. 🎨"],
      [500, "Lumayan, polanya mulai bikin pusing ya. 🌀"],
      [0, "Pola itu licin ya. Coba lagi! 🔴🔵🟢🟡"],
    ],
    warna: [
      [250, "Otak anti-tipu! Warna pun tak bisa mengecoh. 🌈"],
      [150, "Fokusmu tajam, mata dan otak kompak. 👁️"],
      [70, "Lumayan, tulisannya masih suka menggoda. 🎭"],
      [0, "Tulisannya menipumu mentah-mentah. Coba lagi! 😵"],
    ],
    angka: [
      [650, "Mata elang! Angka berserakan pun beres. 🦅"],
      [450, "Cepat dan teliti, mantap. 🔢"],
      [250, "Lumayan, angkanya masih suka ngumpet. 🙈"],
      [0, "Angka 1 di mana ya… coba lagi! 🔍"],
    ],
    beda: [
      [250, "Mata detektif! Tak ada yang lolos darimu. 🕵️"],
      [150, "Teliti dan cepat, mantap. 🔍"],
      [70, "Lumayan, emojinya mirip-mirip ya. 😵"],
      [0, "Semuanya kelihatan sama… coba lagi! 👀"],
    ],
    besar: [
      [250, "Kalkulator hidup! Selisih sekecil apa pun ketahuan. ⚖️"],
      [150, "Intuisi angkamu tajam. 🧮"],
      [70, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Besar atau kecil… sama-sama membingungkan. 🌀"],
    ],
  };
  return (tiers[game].find(([min]) => score >= min) ?? tiers[game][3])[1];
}
