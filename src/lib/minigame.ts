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
  | "besar"
  | "g2048"
  | "ular"
  | "dua4"
  | "sandi"
  | "ranjau"
  | "ketik"
  | "buah"
  | "tebak"
  | "lampu"
  | "geser"
  | "bidik"
  | "balok"
  | "hindar"
  | "gelas"
  | "jumlah"
  | "ingat"
  | "banyak"
  | "arah"
  | "kali"
  | "cek"
  | "kembar"
  | "urut"
  | "huruf"
  | "lanjut"
  | "selisih"
  | "hilang";

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
    label: "Cari Angka",
    emoji: "🔢",
    tagline: "Temukan angka yang diminta di antara tumpukan angka. Perintahnya acak dan makin sulit!",
    rules: [
      "60 detik, tiap ronde ada satu perintah dan papan angka acak (bukan berurutan).",
      "Perintah bervariasi: angka tertentu, terbesar, terkecil, kelipatan, sampai jumlah digit. Angka mirip jadi pengecoh!",
      "Benar +10 sampai +60 (makin tinggi level & makin cepat makin besar). Salah -5 dan papan diacak ulang.",
    ],
    needs: "",
  },
  jumlah: {
    group: "umum",
    label: "Jumlah Pas",
    emoji: "➕",
    tagline: "Pilih dua angka yang jika dijumlahkan tepat sama dengan target!",
    rules: [
      "45 detik, tiap soal ada target dan beberapa angka di papan.",
      "Tap dua angka yang jumlahnya pas target. Benar +15, salah -5.",
      "Makin lama papan makin ramai dan angkanya makin besar.",
    ],
    needs: "",
  },
  ingat: {
    group: "umum",
    label: "Ingat Angka",
    emoji: "📟",
    tagline: "Hafalkan deretan angka yang berkedip lalu ketik ulang. Makin benar, makin panjang!",
    rules: [
      "75 detik. Angka tampil sebentar lalu hilang, ketik ulang dengan keypad atau keyboard.",
      "Benar +10 per digit, lalu deret bertambah satu (maks 12).",
      "Salah = tanpa poin dan deret berkurang satu (minimal 3).",
    ],
    needs: "",
  },
  banyak: {
    group: "umum",
    label: "Banyak Mana",
    emoji: "⚖️",
    tagline: "Dua kotak berisi emoji, mana yang isinya lebih banyak? Selisihnya makin tipis!",
    rules: [
      "30 detik, tap kotak yang emojinya lebih banyak (keyboard: F kiri, J kanan, atau ← →).",
      "Benar +10, salah -5.",
      "Makin lama selisih jumlahnya makin kecil.",
    ],
    needs: "",
  },
  arah: {
    group: "umum",
    label: "Arah Terbalik",
    emoji: "🧭",
    tagline: "Ikuti panah, tapi kalau diminta BALIK ARAH, tap arah sebaliknya!",
    rules: [
      "30 detik, aturan IKUTI = tap arah panah, aturan BALIK = tap arah berlawanan.",
      "Pakai tombol arah di layar atau keyboard (panah / WASD).",
      "Benar +10, salah -5. Makin lama aturan BALIK makin sering muncul.",
    ],
    needs: "",
  },
  kali: {
    group: "umum",
    label: "Tap Kelipatan",
    emoji: "✴️",
    tagline: "Tap semua angka yang merupakan kelipatan dari angka yang diminta. Jangan kena pengecoh!",
    rules: [
      "45 detik, tiap ronde ada satu angka k dan papan penuh angka acak.",
      "Tap SEMUA kelipatan k di papan. Tiap benar +5, ronde beres +10.",
      "Salah tap -5. Angka k makin besar dan papan makin ramai.",
    ],
    needs: "",
  },
  cek: {
    group: "umum",
    label: "Cek Hitungan",
    emoji: "✅",
    tagline: "Persamaan di layar itu benar atau salah? Putuskan dalam sekejap!",
    rules: [
      "30 detik, satu persamaan muncul bergantian (tambah, kurang, kali).",
      "Tap BENAR atau SALAH (keyboard: F untuk benar, J untuk salah, atau ← →).",
      "Benar +10, salah -5. Jawaban yang salah sering selisih tipis!",
    ],
    needs: "",
  },
  kembar: {
    group: "umum",
    label: "Cari Kembar",
    emoji: "👯",
    tagline: "Semua emoji berbeda kecuali satu pasang kembar. Temukan dua-duanya!",
    rules: [
      "40 detik, papan emoji makin besar tiap ronde.",
      "Tap dua emoji yang sama. Benar +20, salah -5.",
      "Cuma ada satu pasang kembar di tiap papan.",
    ],
    needs: "",
  },
  urut: {
    group: "umum",
    label: "Urut Angka",
    emoji: "📶",
    tagline: "Tap angka dari yang terkecil ke terbesar. Kadang diminta sebaliknya!",
    rules: [
      "40 detik, tiap ronde ada 4-9 angka acak.",
      "Tap sesuai urutan yang diminta (kecil→besar atau besar→kecil). Tiap benar +5, ronde beres +10.",
      "Salah tap -5 dan urutan ronde itu diulang dari awal.",
    ],
    needs: "",
  },
  huruf: {
    group: "umum",
    label: "Huruf Hilang",
    emoji: "🔡",
    tagline: "Satu huruf pada kata hilang. Huruf apa yang cocok melengkapinya?",
    rules: [
      "40 detik, kata istilah kerja & IT dengan satu huruf hilang.",
      "Pilih huruf yang tepat dari 4 pilihan (keyboard: tombol 1-4).",
      "Benar +10, salah -5.",
    ],
    needs: "",
  },
  lanjut: {
    group: "umum",
    label: "Lanjut Pola",
    emoji: "🔴",
    tagline: "Deretan bulatan berwarna punya pola berulang. Warna apa berikutnya?",
    rules: [
      "40 detik, polanya makin panjang dan rumit.",
      "Pilih bulatan yang melanjutkan pola dari 4 pilihan (keyboard: tombol 1-4).",
      "Benar +10, salah -5.",
    ],
    needs: "",
  },
  selisih: {
    group: "umum",
    label: "Selisih Angka",
    emoji: "➖",
    tagline: "Berapa selisih dua angka ini? Hitung di kepala, jangan tertipu pilihan mirip!",
    rules: [
      "30 detik, dua angka makin besar tiap soal.",
      "Pilih selisihnya dari 4 pilihan yang angkanya mirip (keyboard: tombol 1-4).",
      "Benar +10, salah -5.",
    ],
    needs: "",
  },
  hilang: {
    group: "umum",
    label: "Siapa Hilang",
    emoji: "🫥",
    tagline: "Hafalkan emoji yang tampil, lalu tebak satu yang menghilang!",
    rules: [
      "40 detik, emoji tampil sebentar lalu satu di antaranya hilang.",
      "Tap emoji yang hilang dari daftar pilihan.",
      "Benar +15, salah -5. Makin lama emojinya makin banyak.",
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
  g2048: {
    group: "umum",
    label: "Gabung 2048",
    emoji: "🟧",
    tagline: "Geser dan gabungkan kotak bernilai sama sampai mencapai 2048!",
    rules: [
      "Geser papan 4x4 (panah / WASD / swipe). Semua kotak ikut bergeser.",
      "Dua kotak sama bergabung jadi dua kali lipat, skor bertambah sebesar hasil gabungannya.",
      "Selesai saat papan penuh dan tidak ada gerakan lagi.",
    ],
    needs: "",
  },
  ular: {
    group: "umum",
    label: "Ular Lapar",
    emoji: "🐍",
    tagline: "Makan apel sebanyak mungkin tanpa menabrak dinding atau badan sendiri!",
    rules: [
      "Kendalikan ular dengan panah / WASD / swipe / tombol arah.",
      "Tiap 🍎 +10, ular makin panjang dan makin cepat.",
      "Menabrak dinding atau badan sendiri = selesai.",
    ],
    needs: "",
  },
  dua4: {
    group: "umum",
    label: "Hitung 24",
    emoji: "🎯",
    tagline: "Susun 4 angka dengan + − × ÷ dan kurung sampai hasilnya tepat 24!",
    rules: [
      "150 detik, soal tak terbatas (4 angka 1-9, dijamin ada jawabannya).",
      "Pakai tiap angka tepat satu kali. Boleh pakai kurung.",
      "Benar = 150 + bonus kecepatan (maks +100). Soal buntu boleh dilewati.",
    ],
    needs: "",
  },
  sandi: {
    group: "umum",
    label: "Sandi Rahasia",
    emoji: "🔐",
    tagline: "Pecahkan sandi 4 warna dari petunjuk. Seberapa jeli logikamu?",
    rules: [
      "3 sandi (4 warna, boleh berulang), 180 detik total, maks 10 tebakan per sandi.",
      "● = warna & posisi pas, ○ = warna ada tapi posisi salah.",
      "Makin sedikit tebakan & makin cepat, makin besar poin.",
    ],
    needs: "",
  },
  ranjau: {
    group: "umum",
    label: "Cari Ranjau",
    emoji: "💣",
    tagline: "Buka semua kotak aman tanpa menginjak ranjau. Pakai logika, bukan tebakan!",
    rules: [
      "Papan 9x9 berisi 10 ranjau. Angka = jumlah ranjau di 8 kotak sekitarnya.",
      "Klik pertama selalu aman. Tandai ranjau dengan klik kanan atau Mode bendera.",
      "Menang = 500 + bonus waktu. Kalah = 5 poin per kotak aman yang terbuka.",
    ],
    needs: "",
  },
  ketik: {
    group: "umum",
    label: "Ketik Kata",
    emoji: "⌨️",
    tagline: "Ketik kata yang tampil secepat dan sebenar mungkin. Uji kecepatan jarimu!",
    rules: [
      "45 detik, kata muncul satu per satu (istilah kantor & IT).",
      "Otomatis lanjut begitu kata diketik dengan benar.",
      "10 poin per huruf, +20 bonus kalau tanpa salah, plus bonus kombo.",
    ],
    needs: "",
  },
  buah: {
    group: "umum",
    label: "Tangkap Buah",
    emoji: "🧺",
    tagline: "Geser keranjang menangkap buah yang berjatuhan. Awas bom!",
    rules: [
      "40 detik, geser keranjang dengan mouse/jari atau panah / A D.",
      "Buah +10, bintang emas ⭐ +30, bom 💣 -20.",
      "Makin lama barang makin cepat jatuh.",
    ],
    needs: "",
  },
  tebak: {
    group: "umum",
    label: "Tebak Angka",
    emoji: "🔮",
    tagline: "Tebak angka rahasia 1-100 dengan petunjuk terlalu besar atau kecil.",
    rules: [
      "3 ronde, tiap ronde angka rahasia 1-100 dan maks 7 tebakan.",
      "Petunjuk: terlalu besar atau terlalu kecil. Trik: tebak bagian tengahnya!",
      "Benar = 100 + 50 per sisa tebakan. Gagal = 0 poin ronde itu.",
    ],
    needs: "",
  },
  lampu: {
    group: "umum",
    label: "Lampu Padam",
    emoji: "💡",
    tagline: "Matikan semua lampu! Tiap tap membalik lampu itu dan 4 tetangganya.",
    rules: [
      "3 papan 4x4, total 120 detik.",
      "Tap lampu = balik status lampu itu plus atas, bawah, kiri, kanan.",
      "Papan padam = 150 + bonus sedikit langkah (maks +60). Semua selesai = bonus sisa waktu.",
    ],
    needs: "",
  },
  geser: {
    group: "umum",
    label: "Puzzle Geser",
    emoji: "🧩",
    tagline: "Geser kotak sampai angka 1-8 berurutan. Klasik tapi bikin nagih!",
    rules: [
      "Papan 3x3 teracak, 120 detik.",
      "Tap kotak di sebelah ruang kosong untuk menggesernya.",
      "Selesai = 400 + bonus waktu + bonus sedikit langkah. Belum selesai = 20 poin per kotak yang sudah pas.",
    ],
    needs: "",
  },
  bidik: {
    group: "umum",
    label: "Bidik Target",
    emoji: "🎯",
    tagline: "Target muncul sekejap di posisi acak. Tap sebelum kabur — jangan asal tap!",
    rules: [
      "30 detik, satu target muncul bergantian dan makin cepat hilang.",
      "Kena +10, plus bonus kalau cepat dan bonus tiap 5 kombo.",
      "Tap area kosong -2 dan kombo hangus.",
    ],
    needs: "",
  },
  balok: {
    group: "umum",
    label: "Tumpuk Balok",
    emoji: "🏗️",
    tagline: "Jatuhkan balok pas di atas tumpukan. Yang menjorok akan terpotong!",
    rules: [
      "Balok bergerak kiri-kanan, tap (atau Spasi) untuk menjatuhkannya.",
      "Tiap lantai +10, tumpukan hampir pas (perfect) +15 dan lebar tidak berkurang.",
      "Balok meleset total = selesai. Makin tinggi makin cepat.",
    ],
    needs: "",
  },
  hindar: {
    group: "umum",
    label: "Hindari Rintangan",
    emoji: "🏎️",
    tagline: "Geser antar 3 jalur, hindari rintangan dan kumpulkan koin sejauh mungkin!",
    rules: [
      "Pindah jalur dengan ← → / A D atau tombol di layar.",
      "Jarak tempuh menambah skor, tiap 🪙 +15.",
      "Menabrak 🚧 = selesai. Makin jauh makin cepat dan ramai.",
    ],
    needs: "",
  },
  gelas: {
    group: "umum",
    label: "Tebak Gelas",
    emoji: "🥤",
    tagline: "Awasi gelas yang menyembunyikan bola saat diacak, lalu tebak posisinya!",
    rules: [
      "Bola ditunjukkan sebentar, lalu 3 gelas saling bertukar tempat.",
      "Tap gelas yang menyembunyikan bola. Benar = 100 + 25 x ronde.",
      "3 nyawa. Makin tinggi ronde, acakan makin banyak dan cepat.",
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
  "g2048",
  "ular",
  "dua4",
  "sandi",
  "ranjau",
  "ketik",
  "buah",
  "tebak",
  "lampu",
  "geser",
  "bidik",
  "balok",
  "hindar",
  "gelas",
  "jumlah",
  "ingat",
  "banyak",
  "arah",
  "kali",
  "cek",
  "kembar",
  "urut",
  "huruf",
  "lanjut",
  "selisih",
  "hilang",
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
      [700, "Mata elang! Angka berserakan pun beres. 🦅"],
      [450, "Cepat dan teliti, mantap. 🔢"],
      [250, "Lumayan, angkanya masih suka ngumpet. 🙈"],
      [0, "Angkanya licin-licin ya… coba lagi! 🔍"],
    ],
    jumlah: [
      [300, "Kalkulator manusia! Pasangan angka langsung ketemu. ➕"],
      [200, "Hitunganmu tajam, mantap. 🧮"],
      [100, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Angkanya belum mau berpasangan… coba lagi! 💔"],
    ],
    ingat: [
      [400, "Ingatan baja! Deret panjang pun hafal. 📟"],
      [250, "Memorimu tajam. 🧠"],
      [120, "Lumayan, angkanya mulai licin ya. 🌀"],
      [0, "Angkanya keburu kabur… coba lagi! 💨"],
    ],
    banyak: [
      [200, "Mata penghitung ulung! Selisih tipis pun ketahuan. 👁️"],
      [120, "Insting jumlahmu tajam. ⚖️"],
      [60, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Semuanya kelihatan sama banyak… coba lagi! 😵"],
    ],
    arah: [
      [250, "Otak anti-bingung! Arah apa pun beres. 🧭"],
      [150, "Refleks dan fokusmu mantap. 🎯"],
      [70, "Lumayan, aturan balik masih menipu. 🔄"],
      [0, "Kiri atau kanan ya… coba lagi! 🌀"],
    ],
    kali: [
      [300, "Mata tajam! Kelipatan apa pun ketahuan. ✴️"],
      [200, "Hitunganmu cepat dan teliti, mantap. 🔢"],
      [100, "Lumayan, tabel perkalian perlu dipoles. ✏️"],
      [0, "Kelipatannya ngumpet semua… coba lagi! 🙈"],
    ],
    cek: [
      [250, "Auditor andal! Hitungan salah tak lolos. ✅"],
      [150, "Cepat dan teliti, mantap. 🧮"],
      [70, "Lumayan, selisih tipis masih menipu. 🤏"],
      [0, "Benar atau salah… sama-sama meragukan! 🌀"],
    ],
    kembar: [
      [300, "Detektif kembar! Pasangan apa pun ketemu. 👯"],
      [200, "Mata jeli, mantap. 👀"],
      [100, "Lumayan, emojinya banyak banget ya. 😵"],
      [0, "Kembarannya pandai bersembunyi! 🕵️"],
    ],
    urut: [
      [350, "Raja urutan! Angka acak pun rapi seketika. 📶"],
      [220, "Cepat dan teliti, mantap. 🔢"],
      [100, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Urutannya kusut… coba lagi! 🧵"],
    ],
    huruf: [
      [150, "Kamus berjalan! Huruf apa pun lengkap. 🔡"],
      [100, "Mata jeli, kosa katamu mantap. 👀"],
      [50, "Lumayan, hurufnya masih suka kabur. 🌀"],
      [0, "Hurufnya sembunyi semua… coba lagi! 🙈"],
    ],
    lanjut: [
      [150, "Pembaca pola ulung! Bulatan apa pun tertebak. 🔴"],
      [100, "Logikamu rapi, mantap. 🧠"],
      [50, "Lumayan, polanya mulai rumit ya. 🌀"],
      [0, "Polanya masih misteri… coba lagi! 🔮"],
    ],
    selisih: [
      [150, "Kalkulator hidup! Selisih apa pun beres. ➖"],
      [100, "Hitunganmu cepat dan teliti. 🧮"],
      [50, "Lumayan, pilihan mirip memang menipu. 😵"],
      [0, "Selisihnya licin… coba lagi! 🌀"],
    ],
    hilang: [
      [120, "Ingatan fotografis! Tak ada yang lolos. 📸"],
      [80, "Memorimu tajam, mantap. 🧠"],
      [40, "Lumayan, emojinya mulai banyak ya. 🌀"],
      [0, "Siapa yang hilang? Entahlah… coba lagi! 🫥"],
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
    g2048: [
      [20000, "Master 2048! Otak strategimu luar biasa. 👑"],
      [8000, "Mencapai kotak raksasa, mantap. 🏆"],
      [2500, "Gabunganmu rapi, tinggal sedikit lagi. 🧩"],
      [0, "Papannya cepat penuh ya. Coba strategi sudut! 🧱"],
    ],
    ular: [
      [300, "Ular piton level dewa! Papan nyaris penuh. 🐍"],
      [150, "Gerakanmu lincah, perutnya kenyang. 🍎"],
      [60, "Lumayan, mulai paham belokannya. 👍"],
      [0, "Ularnya masih lapar dan bingung. Coba lagi! 😵"],
    ],
    dua4: [
      [1500, "Jenius angka! 24 muncul dari mana saja. 🎯"],
      [900, "Otak hitungmu tajam, mantap. 🧮"],
      [300, "Lumayan, mulai dapat feel-nya. ✏️"],
      [0, "Angkanya licin ya. Coba lagi! 🌀"],
    ],
    sandi: [
      [1000, "Pemecah sandi kelas agen rahasia! 🕵️"],
      [600, "Logikamu rapi, sandi pun menyerah. 🔐"],
      [250, "Lumayan, tinggal diasah deduksinya. 🔎"],
      [0, "Sandinya masih rahasia besar… coba lagi! 🤐"],
    ],
    ranjau: [
      [900, "Penjinak ranjau handal, cepat dan teliti! 💣"],
      [500, "Papan bersih, nyawa selamat. 🎖️"],
      [200, "Hampir saja! Sedikit lagi. 😅"],
      [0, "Duar! Ranjaunya bersembunyi di mana-mana. 💥"],
    ],
    ketik: [
      [2200, "Jari kilat! Keyboard-mu sampai berasap. 🔥"],
      [1400, "Ketikanmu cepat dan rapi, mantap. ⌨️"],
      [700, "Lumayan, tinggal diasah lagi. 💪"],
      [0, "Pelan tapi pasti. Latihan lagi yuk! 🐢"],
    ],
    buah: [
      [650, "Keranjang sakti! Tak ada yang lolos. 🧺"],
      [400, "Tangkapanmu jitu, bom pun terhindar. 🍎"],
      [200, "Lumayan, keranjangnya masih bolong. 😅"],
      [0, "Buahnya jatuh semua… coba lagi! 🍌"],
    ],
    tebak: [
      [900, "Peramal sejati! Binary search di kepalamu. 🔮"],
      [600, "Tebakanmu terarah, mantap. 🎯"],
      [300, "Lumayan, coba selalu tebak bagian tengah. ➗"],
      [0, "Angkanya licin sekali. Coba lagi! 🌀"],
    ],
    lampu: [
      [700, "Master lampu! Gelap gulita dalam sekejap. 🌑"],
      [450, "Logikamu terang benderang. 💡"],
      [200, "Lumayan, tinggal cari polanya. 🔦"],
      [0, "Lampunya masih menyala semua… coba lagi! ✨"],
    ],
    geser: [
      [900, "Jago puzzle! Berurutan dengan cepat. 🧠"],
      [650, "Geseranmu rapi, mantap. 🧩"],
      [350, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Kotaknya bandel ya. Coba lagi! 🌀"],
    ],
    bidik: [
      [450, "Sniper kantoran! Tak ada target yang lolos. 🎯"],
      [300, "Bidikanmu tajam, mantap. 👁️"],
      [150, "Lumayan, tinggal diasah lagi. ✏️"],
      [0, "Targetnya lincah sekali. Coba lagi! 💨"],
    ],
    balok: [
      [600, "Arsitek menara! Tumpukanmu menjulang. 🏙️"],
      [350, "Tangan stabil, balok pun patuh. 🏗️"],
      [150, "Lumayan, tinggal atur timing-nya. ⏱️"],
      [0, "Baloknya meleset… coba lagi! 🧱"],
    ],
    hindar: [
      [400, "Pembalap handal! Rintangan apa pun terhindar. 🏁"],
      [250, "Kemudimu lincah, mantap. 🏎️"],
      [100, "Lumayan, jalanan mulai ramai ya. 🚧"],
      [0, "Tabrakan dini… coba lagi! 💥"],
    ],
    gelas: [
      [1200, "Mata elang! Gelas apa pun tak bisa mengecoh. 🦅"],
      [700, "Fokusmu tajam, mantap. 🥤"],
      [300, "Lumayan, gelasnya mulai licin ya. 🌀"],
      [0, "Bolanya pandai bersembunyi! ⚽"],
    ],
  };
  return (tiers[game].find(([min]) => score >= min) ?? tiers[game][3])[1];
}
