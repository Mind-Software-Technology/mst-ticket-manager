// =====================================================
// Minigame — tipe, helper, dan rekor pribadi
//
// Semua soal/permainan dibangun dari tiket asli. Rekor disimpan di
// localStorage per user + per game (hanya kenyamanan pribadi, tidak
// dibagikan ke tim).
// =====================================================

import type { TicketPriority, TicketState } from "@/types";

export type GameKey = "quiz" | "deadline" | "whack";

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
};

export const GAME_KEYS: GameKey[] = ["quiz", "deadline", "whack"];

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
  };
  return (tiers[game].find(([min]) => score >= min) ?? tiers[game][3])[1];
}
