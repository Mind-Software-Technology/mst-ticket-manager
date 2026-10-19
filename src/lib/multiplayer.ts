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

export type MpMode = "quiz" | "rebutan" | "race";

export interface MpModeConfig {
  label: string;
  emoji: string;
  tagline: string;
  rules: string[];
  minPlayers: number;
}

export const MP_MODES: Record<MpMode, MpModeConfig> = {
  quiz: {
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
  race: {
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

export const MP_MODE_KEYS: MpMode[] = ["quiz", "rebutan", "race"];

export const ROUND_MS = 15_000;
export const RACE_SECONDS = 45;
export const MP_ROUNDS = 10;

// ─── Soal ────────────────────────────────────────────

export type QuestionKind = "owner" | "category" | "deadline";

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
export function scoreRound(q: MpQuestion, answers: RoundAnswers, mode: "quiz" | "rebutan"): Record<string, number> {
  const correct = Object.entries(answers)
    .filter(([, a]) => a.c === q.answer)
    .sort((a, b) => a[1].ms - b[1].ms || a[0].localeCompare(b[0]));
  const pts: Record<string, number> = {};
  correct.forEach(([id, a], rank) => {
    pts[id] =
      mode === "rebutan"
        ? (RANK_POINTS[rank] ?? 40)
        : 100 + Math.round(Math.max(0, 1 - a.ms / ROUND_MS) * 100);
  });
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
}

export type MpMessage =
  | ({ t: "start" } & StartPayload)
  | { t: "lobby" }
  | { t: "round"; i: number }
  | { t: "ans"; i: number; id: string; c: number; ms: number }
  | { t: "reveal"; i: number; answers: RoundAnswers }
  | { t: "end" }
  | { t: "prog"; id: string; score: number; n: number; done?: boolean };

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
