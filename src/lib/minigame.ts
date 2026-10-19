// =====================================================
// Minigame — tipe, helper, dan rekor pribadi
//
// Semua soal/permainan dibangun dari tiket asli. Rekor disimpan di
// localStorage per user + per game (hanya kenyamanan pribadi, tidak
// dibagikan ke tim).
// =====================================================

import type { TicketCategory, TicketPriority, TicketState } from "@/types";

export type GameKey = "quiz" | "deadline" | "whack" | "priority_sort" | "category_guess" | "speed_type";

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
  label: string;
  emoji: string;
  tagline: string;
  rules: string[];
  /** Syarat minimal data tiket (ditampilkan kalau belum cukup). */
  needs: string;
}

export const GAMES: Record<GameKey, GameConfig> = {
  quiz: {
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
};

export const GAME_KEYS: GameKey[] = ["quiz", "deadline", "whack", "priority_sort", "category_guess", "speed_type"];

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
  };
  return (tiers[game].find(([min]) => score >= min) ?? tiers[game][3])[1];
}
