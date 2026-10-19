// =====================================================
// Check-In Leaderboard — logika peringkat + gelar kocak
//
// Murni fungsi (tanpa React/Supabase) supaya gampang dipakai ulang.
// =====================================================

export type BoardKey = "streak" | "rajin" | "pagi";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  division: string | null;
  streak: number;
  /** Jumlah hari berbeda yang check-in di bulan berjalan. */
  monthDays: number;
  /** Rata-rata menit sejak 00:00 saat check-in (30 hari terakhir), null kalau < MIN_SAMPLES. */
  avgMinute: number | null;
  checkedInToday: boolean;
}

export const MIN_EARLY_SAMPLES = 3;
export const STREAK_MILESTONE = 50;

export const BOARDS: Record<BoardKey, { label: string; emoji: string; tagline: string; unit: string }> = {
  streak: { label: "Raja Streak", emoji: "🔥", tagline: "Api abadi, jangan sampai padam!", unit: "hari" },
  rajin: { label: "Si Paling Rajin", emoji: "📅", tagline: "Hari check-in terbanyak bulan ini", unit: "hari" },
  pagi: { label: "Ayam Jago", emoji: "🐓", tagline: "Rata-rata check-in paling subuh", unit: "" },
};

/** Urutkan sesuai papan yang dipilih; yang tidak layak masuk papan dibuang. */
export function rankEntries(entries: LeaderboardEntry[], board: BoardKey): LeaderboardEntry[] {
  const byName = (a: LeaderboardEntry, b: LeaderboardEntry) => a.name.localeCompare(b.name);
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

export function scoreLabel(e: LeaderboardEntry, board: BoardKey): string {
  switch (board) {
    case "streak":
      return `${e.streak}`;
    case "rajin":
      return `${e.monthDays}`;
    case "pagi":
      return formatMinute(e.avgMinute);
  }
}

export function formatMinute(min: number | null): string {
  if (min === null) return "--:--";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(m === 60 ? h + 1 : h).padStart(2, "0")}:${String(m === 60 ? 0 : m).padStart(2, "0")}`;
}

/** Hash stabil: nama sama → pilihan gelar/warna sama (tidak berubah tiap render). */
export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: string): T {
  return arr[hashString(seed) % arr.length];
}

const PODIUM_TITLES = {
  streak: [
    ["Dewa Absen", "Sang Penjaga Api Abadi", "Absennya Lebih Konsisten dari Jadwal Subuh"],
    ["Calon Penerus Takhta", "Bayangan di Belakang Juara", "Tinggal Satu Salah Langkah dari Lengser Sang Raja"],
    ["Hampir Juara (Sedikit Lagi!)", "Medali Perunggu, Hati Emas", "Juara Tiga, Semangat Juara Satu"],
  ],
  rajin: [
    ["Karyawan Teladan Versi Sendiri", "Kursinya Belum Sempat Dingin", "Absen Dulu, Kopi Kemudian"],
    ["Rajin Pangkal Kaya (Mungkin)", "Pantang Pulang Sebelum Check-In"],
    ["Rajinnya Tipis-Tipis tapi Pasti", "Konsisten Tanpa Banyak Drama"],
  ],
  pagi: [
    ["Ayam Jago Kantor", "Bangun Sebelum Alarmnya Bangun", "Matahari Saja Kalah Pagi"],
    ["Burung Pertama Cari Cacing", "Subuh-Subuh Sudah Produktif"],
    ["Pagi, tapi Masih Ada yang Lebih Pagi", "Cukup Pagi untuk Dibilang Rajin"],
  ],
} as const;

/** Gelar kocak per peringkat. rank = 0-based. */
export function titleFor(e: LeaderboardEntry, board: BoardKey, rank: number): string {
  if (rank < 3) return pick(PODIUM_TITLES[board][rank], `${e.userId}-${board}`);

  const seed = `${e.userId}-${board}`;
  const value = board === "streak" ? e.streak : board === "rajin" ? e.monthDays : 1;

  if (board === "pagi") {
    return pick(["Lumayan Pagi, Lumayan Ngantuk", "Masih Satu Frekuensi dengan Matahari", "Pagi Versi Realistis"], seed);
  }
  if (value >= 20) return pick(["Mesin Absen Berjalan", "Komitmennya Mengalahkan Cicilan", "Tinggal Dipajang di Museum"], seed);
  if (value >= 10) return pick(["Mulai Kecanduan Check-In", "Rajin Bukan Kaleng-Kaleng", "Aura Karyawan Teladan"], seed);
  if (value >= 5) return pick(["Lagi Semangat-Semangatnya", "Pemanasan Dulu, Juara Belakangan", "Api Mulai Menyala"], seed);
  if (value >= 1) return pick(["Baru Mulai, Tetap Disayang", "Percikan Api Kecil", "Pelan-Pelan Asal Check-In"], seed);
  return pick(["Lagi Healing Dulu 🏝️", "Arwah Gentayangan 👻", "Ditunggu Kehadirannya, Ya…", "Diduga Terjebak di Mode Pesawat ✈️"], seed);
}

/** Ledekan ringan untuk footer kartu (hanya yang belum check-in hari ini). */
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

export function avatarGradient(userId: string): string {
  return AVATAR_GRADIENTS[hashString(userId) % AVATAR_GRADIENTS.length];
}
