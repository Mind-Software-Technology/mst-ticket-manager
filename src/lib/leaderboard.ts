// =====================================================
// Leaderboard — logika peringkat + gelar kocak
//
// Dua grup papan: Check-In (streak, rajin, pagi) dan Tiket
// (selesai, jam kerja, tepat waktu, urgent, beban, molor).
// Murni fungsi (tanpa React/Supabase) supaya gampang dipakai ulang.
// =====================================================

export type CheckinBoardKey = "streak" | "rajin" | "pagi";
export type TicketBoardKey = "selesai" | "jam" | "tepat" | "urgent" | "beban" | "molor";
export type BoardKey = CheckinBoardKey | TicketBoardKey;
export type BoardGroup = "checkin" | "ticket";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  division: string | null;
  streak: number;
  /** Jumlah hari berbeda yang check-in di bulan berjalan. */
  monthDays: number;
  /** Rata-rata menit sejak 00:00 saat check-in (30 hari terakhir), null kalau < MIN_EARLY_SAMPLES. */
  avgMinute: number | null;
  checkedInToday: boolean;
}

export interface TicketStatEntry {
  userId: string;
  name: string;
  division: string | null;
  done: number;
  hours: number;
  onTime: number;
  urgent: number;
  open: number;
  overdue: number;
}

/** Baris siap tampil, dipakai komponen presentasional untuk semua papan. */
export interface BoardRow {
  userId: string;
  name: string;
  value: number;
  score: string;
  title: string;
  note?: string;
  badge?: string;
  nudge?: string | null;
  progress?: { pct: number; label: string };
}

export const MIN_EARLY_SAMPLES = 3;
export const STREAK_MILESTONE = 50;

interface BoardConfig {
  group: BoardGroup;
  /** Penjelasan singkat cara menghitung (ditampilkan di bawah tab papan). */
  how: string;
  label: string;
  emoji: string;
  tagline: string;
  unit: string;
  empty: string;
}

export const BOARDS: Record<BoardKey, BoardConfig> = {
  streak: { group: "checkin", how: "Hari kerja berturut-turut yang di-check-in, mengikuti hari aktif dari Config. Hari ini belum check-in tidak memutus streak.", label: "Raja Streak", emoji: "🔥", tagline: "Api abadi, jangan sampai padam!", unit: "hari", empty: "Belum ada peserta. Jadilah yang pertama! 🚀" },
  rajin: { group: "checkin", how: "Jumlah hari berbeda yang check-in pada bulan berjalan.", label: "Si Paling Rajin", emoji: "📅", tagline: "Hari check-in terbanyak bulan ini", unit: "hari", empty: "Belum ada peserta. Jadilah yang pertama! 🚀" },
  pagi: { group: "checkin", how: "Rata-rata jam check-in selama 30 hari terakhir. Minimal 3 kali check-in agar masuk papan.", label: "Ayam Jago", emoji: "🐓", tagline: "Rata-rata check-in paling subuh (30 hari terakhir)", unit: "", empty: "Belum ada ayam jago. Butuh minimal 3 kali check-in dalam 30 hari terakhir. 🐣" },
  selesai: { group: "ticket", how: "Jumlah tiket berstatus Done pada periode terpilih. Tiket dengan beberapa assignee dihitung untuk setiap assignee.", label: "Tukang Beres", emoji: "✅", tagline: "Tiket paling banyak diselesaikan", unit: "tiket", empty: "Belum ada tiket selesai di periode ini. Sepi… 🦗" },
  jam: { group: "ticket", how: "Jumlah jam kerja aktual dari tiket Done. Kalau satu tiket dikerjakan beberapa orang, jamnya dibagi rata.", label: "Mesin Jam Kerja", emoji: "⏱️", tagline: "Total jam kerja aktual dari tiket selesai", unit: "jam", empty: "Belum ada jam kerja tercatat di periode ini. ⌛" },
  tepat: { group: "ticket", how: "Tiket Done yang tanggal selesainya sebelum atau sama dengan deadline. Tiket tanpa deadline tidak dihitung.", label: "Dewa Tepat Waktu", emoji: "🎯", tagline: "Tiket selesai sebelum / pas deadline", unit: "tiket", empty: "Belum ada tiket selesai tepat waktu di periode ini. 🎯" },
  urgent: { group: "ticket", how: "Tiket Done berprioritas Critical atau High pada periode terpilih.", label: "Pemadam Kebakaran", emoji: "🚒", tagline: "Tiket Critical & High yang berhasil dipadamkan", unit: "tiket", empty: "Tidak ada kebakaran yang dipadamkan. Aman? Semoga. 🧯" },
  beban: { group: "ticket", how: "Tiket aktif saat ini (ToDo sampai Ready to Deploy, tanpa Backlog). Periode tidak berpengaruh.", label: "Pemikul Beban", emoji: "🏋️", tagline: "Tiket aktif yang sedang ditanggung sekarang", unit: "tiket", empty: "Tidak ada tiket aktif. Semua tenang. 🧘" },
  molor: { group: "ticket", how: "Tiket aktif yang deadline-nya sudah lewat dan belum Done. Periode tidak berpengaruh.", label: "Raja Molor", emoji: "🐌", tagline: "Tiket lewat deadline yang belum kelar — ayo dikebut!", unit: "tiket", empty: "Tidak ada tiket telat. Tim disiplin banget! 👏" },
};

export const BOARD_KEYS_BY_GROUP: Record<BoardGroup, BoardKey[]> = {
  checkin: ["streak", "rajin", "pagi"],
  ticket: ["selesai", "jam", "tepat", "urgent", "beban", "molor"],
};

// ─── Ranking ─────────────────────────────────────────

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export function rankCheckins(entries: LeaderboardEntry[], board: CheckinBoardKey): LeaderboardEntry[] {
  const list = [...entries];
  switch (board) {
    case "streak":
      return list.sort((a, b) => b.streak - a.streak || b.monthDays - a.monthDays || byName(a, b));
    case "rajin":
      return list.sort((a, b) => b.monthDays - a.monthDays || b.streak - a.streak || byName(a, b));
    case "pagi":
      return list
        .filter((e) => e.avgMinute !== null)
        .sort((a, b) => (a.avgMinute as number) - (b.avgMinute as number) || byName(a, b));
  }
}

const TICKET_SORT: Record<TicketBoardKey, (e: TicketStatEntry) => number> = {
  selesai: (e) => e.done,
  jam: (e) => e.hours,
  tepat: (e) => e.onTime,
  urgent: (e) => e.urgent,
  beban: (e) => e.open,
  molor: (e) => e.overdue,
};

export function ticketValue(e: TicketStatEntry, board: TicketBoardKey): number {
  return TICKET_SORT[board](e);
}

/** Papan tiket hanya menampilkan yang nilainya > 0 (kecuali tidak ada sama sekali). */
export function rankTickets(entries: TicketStatEntry[], board: TicketBoardKey): TicketStatEntry[] {
  const val = TICKET_SORT[board];
  return entries
    .filter((e) => val(e) > 0)
    .sort((a, b) => val(b) - val(a) || b.done - a.done || byName(a, b));
}

export function formatMinute(min: number | null): string {
  if (min === null) return "--:--";
  let h = Math.floor(min / 60);
  let m = Math.round(min % 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

// ─── Gelar kocak ─────────────────────────────────────

/** Hash stabil: nama sama → pilihan gelar/warna sama (tidak berubah tiap render). */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: string): T {
  return arr[hashString(seed) % arr.length];
}

interface TitleSet {
  podium: readonly [readonly string[], readonly string[], readonly string[]];
  /** Urut dari ambang tertinggi ke terendah; dipakai untuk peringkat 4+. */
  tiers: ReadonlyArray<{ min: number; titles: readonly string[] }>;
}

const TITLES: Record<BoardKey, TitleSet> = {
  streak: {
    podium: [
      ["Dewa Absen", "Sang Penjaga Api Abadi", "Absennya Lebih Konsisten dari Jadwal Subuh"],
      ["Calon Penerus Takhta", "Bayangan di Belakang Juara", "Tinggal Satu Salah Langkah dari Lengser Sang Raja"],
      ["Hampir Juara (Sedikit Lagi!)", "Medali Perunggu, Hati Emas", "Juara Tiga, Semangat Juara Satu"],
    ],
    tiers: [
      { min: 20, titles: ["Mesin Absen Berjalan", "Komitmennya Mengalahkan Cicilan", "Tinggal Dipajang di Museum"] },
      { min: 10, titles: ["Mulai Kecanduan Check-In", "Rajin Bukan Kaleng-Kaleng", "Aura Karyawan Teladan"] },
      { min: 5, titles: ["Lagi Semangat-Semangatnya", "Pemanasan Dulu, Juara Belakangan", "Api Mulai Menyala"] },
      { min: 1, titles: ["Baru Mulai, Tetap Disayang", "Percikan Api Kecil", "Pelan-Pelan Asal Check-In"] },
      { min: 0, titles: ["Lagi Healing Dulu 🏝️", "Arwah Gentayangan 👻", "Ditunggu Kehadirannya, Ya…", "Diduga Terjebak di Mode Pesawat ✈️"] },
    ],
  },
  rajin: {
    podium: [
      ["Karyawan Teladan Versi Sendiri", "Kursinya Belum Sempat Dingin", "Absen Dulu, Kopi Kemudian"],
      ["Rajin Pangkal Kaya (Mungkin)", "Pantang Pulang Sebelum Check-In"],
      ["Rajinnya Tipis-Tipis tapi Pasti", "Konsisten Tanpa Banyak Drama"],
    ],
    tiers: [
      { min: 10, titles: ["Rajin Bukan Kaleng-Kaleng", "Aura Karyawan Teladan"] },
      { min: 5, titles: ["Lagi Semangat-Semangatnya", "Pemanasan Dulu, Juara Belakangan"] },
      { min: 1, titles: ["Baru Mulai, Tetap Disayang", "Pelan-Pelan Asal Check-In"] },
      { min: 0, titles: ["Lagi Healing Dulu 🏝️", "Arwah Gentayangan 👻"] },
    ],
  },
  pagi: {
    podium: [
      ["Ayam Jago Kantor", "Bangun Sebelum Alarmnya Bangun", "Matahari Saja Kalah Pagi"],
      ["Burung Pertama Cari Cacing", "Subuh-Subuh Sudah Produktif"],
      ["Pagi, tapi Masih Ada yang Lebih Pagi", "Cukup Pagi untuk Dibilang Rajin"],
    ],
    tiers: [{ min: 0, titles: ["Lumayan Pagi, Lumayan Ngantuk", "Masih Satu Frekuensi dengan Matahari", "Pagi Versi Realistis"] }],
  },
  selesai: {
    podium: [
      ["Tukang Beres Nomor 1", "Backlog Gemetar Melihatmu", "Tiketnya Habis Dilahap"],
      ["Penyapu Bersih Tiket", "Hampir Menyalip Sang Raja"],
      ["Si Cekatan", "Perunggu Tapi Produktif"],
    ],
    tiers: [
      { min: 20, titles: ["Mesin Penghancur Backlog", "Kerjanya Kayak Punya Kembaran"] },
      { min: 10, titles: ["Jago Menutup Tiket", "Close, Close, Close!"] },
      { min: 5, titles: ["Mulai Panas", "Tiket Berguguran"] },
      { min: 0, titles: ["Satu Tiket, Seribu Harapan", "Awal yang Manis"] },
    ],
  },
  jam: {
    podium: [
      ["Mesin Jam Kerja", "Jam Terbang Tertinggi ✈️", "Waktu Adalah Tiket"],
      ["Marathoner Sprint", "Jam Kerjanya Bikin Jam Dinding Capek"],
      ["Pekerja Keras Berkeringat", "Stamina Cadangan Terisi"],
    ],
    tiers: [
      { min: 20, titles: ["Kopi Jadi Darah Daging", "Dedikasi Level Dewa"] },
      { min: 5, titles: ["Jam Kerjanya Lumayan Nendang", "Konsisten Ngegas"] },
      { min: 0, titles: ["Pemanasan Jam Kerja", "Pelan tapi Tercatat"] },
    ],
  },
  tepat: {
    podium: [
      ["Dewa Ketepatan Waktu", "Deadline Takut Padamu", "Jam Tangannya Disinkronkan ke NASA"],
      ["Presisi Setipis Silet", "Selalu Pas, Selalu Cakep"],
      ["On Time, On Fire", "Tepat Waktu Tanpa Drama"],
    ],
    tiers: [
      { min: 10, titles: ["Disiplin Level Tentara", "Kalender Tunduk Padamu"] },
      { min: 3, titles: ["Hobi Menepati Janji", "Anti Telat Club"] },
      { min: 0, titles: ["Mulai Disiplin", "Dikit-Dikit Tepat Waktu"] },
    ],
  },
  urgent: {
    podium: [
      ["Pemadam Kebakaran Andalan 🚒", "Si Penyelamat Critical", "Tenang Saat Semua Panik"],
      ["Asisten Pemadam Handal", "Selang Airnya Selalu Siap"],
      ["Siaga Satu", "Pahlawan Kesiangan (Tapi Tetap Pahlawan)"],
    ],
    tiers: [{ min: 0, titles: ["Anggota Pemadam Muda", "Siap Sedia Kalau Ada Api", "Sudah Pernah Cium Asap"] }],
  },
  beban: {
    podium: [
      ["Pemikul Beban Dunia 🌍", "Atlas Versi Kantor", "Butuh Pelukan 🫂"],
      ["Bahunya Kuat, Hatinya Lebih Kuat", "Sibuk Tingkat Dewa"],
      ["Tiketnya Menumpuk Tapi Tetap Senyum", "Multitasking Berbakat"],
    ],
    tiers: [
      { min: 5, titles: ["Perlu Dibelikan Kopi ☕", "Antrean Tiketnya Panjang"] },
      { min: 0, titles: ["Beban Seimbang", "Kerjaan Terkendali"] },
    ],
  },
  molor: {
    podium: [
      ["Raja Molor 🐌", "Deadline Cuma Saran", "Siput Pun Menyalip"],
      ["Pangeran Penunda", "Sebentar Lagi Katanya…"],
      ["Hampir Raja Molor", "Tolong Dikebut Ya, Sayang"],
    ],
    tiers: [{ min: 0, titles: ["Deadline Mulai Mengintip", "Satu Dua Terlewat, Tak Apa", "Ayo Kejar Sebelum Kena Tegur"] }],
  },
};

/** Gelar kocak per peringkat. rank = 0-based, value = nilai skor papan itu. */
export function titleFor(board: BoardKey, userId: string, rank: number, value: number): string {
  const set = TITLES[board];
  const seed = `${userId}-${board}`;
  if (rank < 3) return pick(set.podium[rank], seed);
  const tier = set.tiers.find((t) => value >= t.min) ?? set.tiers[set.tiers.length - 1];
  return pick(tier.titles, seed);
}

/** Ledekan ringan untuk yang belum check-in hari ini. */
export function nudgeFor(e: LeaderboardEntry): string | null {
  if (e.checkedInToday) return null;
  if (e.streak >= STREAK_MILESTONE) return "Api sebesar ini jangan dibiarkan padam, check-in dong! 🧯";
  if (e.streak >= 10) return `Streak ${e.streak} hari sayang kalau putus hari ini 🥺`;
  if (e.streak >= 1) return "Belum nongol hari ini… lagi macet di tol? 🚗";
  return "Belum pernah mulai? Hari ini hari yang bagus! ✨";
}

/** Sisa hari ke milestone api 50 (null kalau sudah lewat). */
export function daysToMilestone(streak: number): number | null {
  return streak >= STREAK_MILESTONE ? null : STREAK_MILESTONE - streak;
}

// ─── Konversi ke BoardRow ────────────────────────────

export function checkinRows(entries: LeaderboardEntry[], board: CheckinBoardKey): BoardRow[] {
  return rankCheckins(entries, board).map((e, i) => {
    const value = board === "streak" ? e.streak : board === "rajin" ? e.monthDays : (e.avgMinute ?? 0);
    const titleValue = board === "pagi" ? 0 : value;
    return {
      userId: e.userId,
      name: e.name,
      value,
      score: board === "pagi" ? formatMinute(e.avgMinute) : String(value),
      title: titleFor(board, e.userId, i, titleValue),
      badge: e.checkedInToday ? "✅ sudah nongol" : undefined,
      nudge: nudgeFor(e),
      progress:
        board === "streak"
          ? {
              pct: Math.min(100, Math.round((e.streak / STREAK_MILESTONE) * 100)),
              label:
                daysToMilestone(e.streak) === null
                  ? `🎉 Api biru ${STREAK_MILESTONE} terbuka! Legenda.`
                  : `${daysToMilestone(e.streak)} hari lagi menuju api biru ${STREAK_MILESTONE} 🔥`,
            }
          : undefined,
    };
  });
}

export function ticketRows(entries: TicketStatEntry[], board: TicketBoardKey): BoardRow[] {
  return rankTickets(entries, board).map((e, i) => {
    const value = ticketValue(e, board);
    return {
      userId: e.userId,
      name: e.name,
      value,
      score: board === "jam" ? formatHours(value) : String(value),
      title: titleFor(board, e.userId, i, value),
      note:
        board === "beban" || board === "molor"
          ? `${e.open} aktif · ${e.overdue} lewat deadline`
          : `${e.done} selesai · ${formatHours(e.hours)} jam · ${e.onTime} tepat waktu`,
    };
  });
}

// ─── Avatar ──────────────────────────────────────────

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-pink-500 to-rose-500",
  "from-violet-500 to-indigo-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-fuchsia-500 to-purple-500",
  "from-lime-500 to-green-500",
] as const;

/** Pasangan warna hex yang sama urutannya dengan AVATAR_GRADIENTS (untuk canvas). */
const AVATAR_HEX: ReadonlyArray<readonly [string, string]> = [
  ["#ec4899", "#f43f5e"],
  ["#8b5cf6", "#6366f1"],
  ["#0ea5e9", "#06b6d4"],
  ["#10b981", "#14b8a6"],
  ["#f59e0b", "#f97316"],
  ["#d946ef", "#a855f7"],
  ["#84cc16", "#22c55e"],
];

export function avatarColors(userId: string): readonly [string, string] {
  return AVATAR_HEX[hashString(userId) % AVATAR_HEX.length];
}

export function avatarGradient(userId: string): string {
  return AVATAR_GRADIENTS[hashString(userId) % AVATAR_GRADIENTS.length];
}
