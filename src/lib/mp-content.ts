// =====================================================
// Konten minigame multiplayer non-tiket: trivia, tebak emoji, hitung
// =====================================================

import { shuffle } from "@/lib/minigame";

/** [pertanyaan, jawaban benar, 3 pengecoh] */
type Item = readonly [string, string, readonly [string, string, string]];

const TRIVIA: Item[] = [
  ["Ibu kota Australia?", "Canberra", ["Sydney", "Melbourne", "Perth"]],
  ["Planet terbesar di tata surya?", "Jupiter", ["Saturnus", "Neptunus", "Bumi"]],
  ["Proklamator kemerdekaan Indonesia bersama Soekarno?", "Mohammad Hatta", ["Sutan Sjahrir", "Tan Malaka", "Soedirman"]],
  ["Gunung tertinggi di Indonesia?", "Puncak Jaya", ["Kerinci", "Rinjani", "Semeru"]],
  ["Lambang kimia untuk emas?", "Au", ["Ag", "Fe", "Go"]],
  ["Hewan tercepat di darat?", "Cheetah", ["Singa", "Kuda", "Antelop"]],
  ["Pencipta lagu Indonesia Raya?", "W.R. Supratman", ["Ismail Marzuki", "Kusbini", "C. Simanjuntak"]],
  ["Negara berpenduduk terbanyak di dunia (2023)?", "India", ["Tiongkok", "Amerika Serikat", "Indonesia"]],
  ["Bahasa untuk mengatur tampilan halaman web?", "CSS", ["SQL", "JSON", "HTTP"]],
  ["Kode status HTTP untuk halaman tidak ditemukan?", "404", ["500", "403", "301"]],
  ["SQL adalah singkatan dari?", "Structured Query Language", ["Simple Query Logic", "Sequential Question Language", "Standard Query Library"]],
  ["Samudra terluas di dunia?", "Pasifik", ["Atlantik", "Hindia", "Arktik"]],
  ["Candi Buddha terbesar di dunia ada di?", "Borobudur", ["Prambanan", "Mendut", "Sewu"]],
  ["Negara asal sushi?", "Jepang", ["Korea Selatan", "Tiongkok", "Thailand"]],
  ["Berapa jumlah warna pelangi?", "7", ["6", "8", "5"]],
  ["Penemu bola lampu pijar yang praktis?", "Thomas Edison", ["Nikola Tesla", "Isaac Newton", "Graham Bell"]],
  ["Mata uang Jepang?", "Yen", ["Won", "Yuan", "Baht"]],
  ["Logam yang berwujud cair pada suhu ruang?", "Raksa", ["Besi", "Aluminium", "Timah"]],
  ["Ibu kota Jepang?", "Tokyo", ["Kyoto", "Osaka", "Nagoya"]],
  ["Hewan purba khas Pulau Komodo?", "Komodo", ["Orangutan", "Badak Jawa", "Anoa"]],
  ["2 pangkat 10 sama dengan?", "1024", ["512", "2048", "1000"]],
  ["Gas terbanyak di atmosfer bumi?", "Nitrogen", ["Oksigen", "Karbon dioksida", "Argon"]],
  ["Penulis novel Laskar Pelangi?", "Andrea Hirata", ["Tere Liye", "Habiburrahman El Shirazy", "Dee Lestari"]],
  ["Pembuat kernel Linux?", "Linus Torvalds", ["Bill Gates", "Steve Jobs", "Dennis Ritchie"]],
  ["Pendiri Microsoft?", "Bill Gates", ["Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"]],
  ["Rumus kimia air?", "H2O", ["CO2", "NaCl", "O2"]],
  ["Campuran warna biru dan kuning menghasilkan?", "Hijau", ["Ungu", "Oranye", "Cokelat"]],
  ["Danau terluas di Indonesia?", "Danau Toba", ["Danau Poso", "Danau Singkarak", "Danau Maninjau"]],
  ["Kota berjulukan Kota Pahlawan?", "Surabaya", ["Bandung", "Semarang", "Medan"]],
  ["Alat musik bambu tradisional Jawa Barat?", "Angklung", ["Sasando", "Tifa", "Kolintang"]],
  ["Planet yang dijuluki Planet Merah?", "Mars", ["Venus", "Merkurius", "Jupiter"]],
  ["Juara Piala Dunia FIFA 2022?", "Argentina", ["Prancis", "Brasil", "Kroasia"]],
  ["Organ yang memompa darah ke seluruh tubuh?", "Jantung", ["Paru-paru", "Hati", "Ginjal"]],
  ["Nama bahasa pemrograman Python terinspirasi dari?", "Grup komedi Monty Python", ["Ular piton", "Mitologi Yunani", "Film Jurassic Park"]],
  ["Menara Eiffel terletak di negara?", "Prancis", ["Italia", "Spanyol", "Belgia"]],
  ["Pulau yang dijuluki Pulau Dewata?", "Bali", ["Lombok", "Sumba", "Flores"]],
  ["Hasil dari 15 × 15?", "225", ["215", "255", "235"]],
  ["Berapa jumlah sisi segi enam?", "6", ["5", "8", "7"]],
  ["Tanggal Hari Kemerdekaan Indonesia?", "17 Agustus", ["18 Agustus", "17 Juli", "1 Juni"]],
  ["Benua terkecil di dunia?", "Australia", ["Eropa", "Antartika", "Amerika Selatan"]],
];

const EMOJI: Item[] = [
  ["🦁👑", "The Lion King", ["Frozen", "Moana", "Aladdin"]],
  ["❄️👸⛄", "Frozen", ["Tangled", "Cinderella", "Brave"]],
  ["🚢🧊💔", "Titanic", ["Poseidon", "Avatar", "Jaws"]],
  ["🐠🔍", "Finding Nemo", ["The Little Mermaid", "Shark Tale", "Moana"]],
  ["🧙‍♂️💍🌋", "The Lord of the Rings", ["Harry Potter", "Narnia", "The Hobbit: Smaug"]],
  ["⚡👓🧹", "Harry Potter", ["Percy Jackson", "Doctor Strange", "Star Wars"]],
  ["🐼🥋", "Kung Fu Panda", ["Madagascar", "Zootopia", "Rio"]],
  ["🐢🥷🍕", "Ninja Turtles", ["Power Rangers", "Naruto", "Kung Fu Hustle"]],
  ["🧱⛏️", "Minecraft", ["Roblox", "Terraria", "Fortnite"]],
  ["🟡👻🍒", "Pac-Man", ["Space Invaders", "Tetris", "Sonic"]],
  ["🍄🔧", "Super Mario", ["Zelda", "Pokemon", "Donkey Kong"]],
  ["🐜🍬", "Ada gula ada semut", ["Air tenang menghanyutkan", "Tong kosong nyaring bunyinya", "Sedia payung sebelum hujan"]],
  ["🌧️☂️", "Sedia payung sebelum hujan", ["Ada gula ada semut", "Rajin pangkal pandai", "Berakit-rakit ke hulu"]],
  ["🦅🌏🕊️", "Burung Garuda", ["Burung Hantu", "Burung Merpati", "Burung Elang"]],
  ["🔥🦊", "Firefox", ["Chrome", "Opera", "Safari"]],
  ["🍎📱", "iPhone", ["Galaxy", "Pixel", "Xiaomi"]],
  ["🕷️🕸️🦸", "Spider-Man", ["Batman", "Ant-Man", "Daredevil"]],
  ["👻🚫🔫", "Ghostbusters", ["Scooby-Doo", "Casper", "Poltergeist"]],
];

const asQuestion = (kind: "trivia" | "emoji", [prompt, answer, wrong]: Item, hint: string) => {
  const options = shuffle([answer, ...wrong]);
  return { kind, prompt, hint, options, answer: options.indexOf(answer) };
};

export interface ContentQuestion {
  kind: "trivia" | "emoji" | "math" | "scramble" | "antonim" | "peribahasa" | "ibukota" | "pola" | "singkatan" | "fakta" | "unik" | "mayoritas" | "penyusup";
  prompt: string;
  hint: string;
  options: string[];
  answer: number;
}

export function buildTriviaQuestions(count = 10): ContentQuestion[] {
  const emoji = shuffle(EMOJI)
    .slice(0, 3)
    .map((it) => asQuestion("emoji", it, "Tebak maksud emoji ini"));
  const trivia = shuffle(TRIVIA)
    .slice(0, count - emoji.length)
    .map((it) => asQuestion("trivia", it, "Pengetahuan umum"));
  return shuffle([...emoji, ...trivia]);
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export function buildMathQuestions(count = 12): ContentQuestion[] {
  return Array.from({ length: count }, (_, i) => {
    let text: string;
    let result: number;
    if (i < 4) {
      const a = rand(12, 69);
      const b = rand(11, 49);
      const add = Math.random() < 0.6;
      text = `${a} ${add ? "+" : "−"} ${b}`;
      result = add ? a + b : a - b;
    } else if (i < 8) {
      const a = rand(12, 29);
      const b = rand(3, 9);
      text = `${a} × ${b}`;
      result = a * b;
    } else {
      const a = rand(3, 9);
      const b = rand(11, 25);
      const c = rand(5, 40);
      text = `(${a} × ${b}) + ${c}`;
      result = a * b + c;
    }
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const delta = rand(1, 12) * (Math.random() < 0.5 ? -1 : 1);
      if (result + delta !== result) wrong.add(result + delta);
    }
    const options = shuffle([result, ...wrong]).map(String);
    return { kind: "math" as const, prompt: `${text} = ?`, hint: "Hitung di kepala, jangan pakai kalkulator 😏", options, answer: options.indexOf(String(result)) };
  });
}

/** Emoji untuk kartu Memori Kilat. */
const MEMORY_EMOJI = ["🍕", "🚀", "🎸", "🐙", "🌵", "🍩", "👾", "🦄", "⚽", "🎲", "🍉", "🛸", "🐢", "🎧", "🔥", "🌈"];

export const MEMORY_PAIRS = 8;

export function buildMemoryDeck(): string[] {
  const picks = shuffle(MEMORY_EMOJI).slice(0, MEMORY_PAIRS);
  return shuffle([...picks, ...picks]);
}

export const REFLEX_ROUNDS = 6;

export function buildReflexDelays(): number[] {
  return Array.from({ length: REFLEX_ROUNDS }, () => rand(1500, 4500));
}

const WORDS = [
  "KOMPUTER", "KEYBOARD", "JARINGAN", "SERVER", "DATABASE", "SPRINT", "DEPLOY", "KLIEN", "PRODUK", "LAPORAN",
  "PROYEK", "DESAIN", "PEMROGRAM", "INTERNET", "APLIKASI", "MONITOR", "BROWSER", "PASSWORD", "LAYAR", "SEMANGAT",
  "KOLABORASI", "DEADLINE", "BACKEND", "FRONTEND", "TESTING", "REVIEW", "KOPI", "LEMBUR", "SEMINAR", "TARGET",
  "KANBAN", "MARKETING", "FINANSIAL", "STRATEGI", "PRESENTASI", "KOORDINASI",
];

function scramble(word: string): string {
  let out = word;
  for (let i = 0; i < 10 && out === word; i++) out = shuffle(word.split("")).join("");
  return out;
}

export function buildScrambleQuestions(count = 10): ContentQuestion[] {
  return shuffle(WORDS)
    .slice(0, count)
    .map((word) => {
      const near = shuffle(WORDS.filter((w) => w !== word)).sort(
        (a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length),
      );
      const options = shuffle([word, ...near.slice(0, 3)]);
      return {
        kind: "scramble" as const,
        prompt: scramble(word).split("").join(" "),
        hint: `${word.length} huruf — pilih kata aslinya`,
        options,
        answer: options.indexOf(word),
      };
    });
}

export const SIMON_MAX = 40;

export function buildSimonPattern(): number[] {
  return Array.from({ length: SIMON_MAX }, () => rand(0, 3));
}

// ─── Warna Mengecoh (Stroop) ─────────────────────────

export const STROOP_COLORS = ["MERAH", "BIRU", "HIJAU", "KUNING"] as const;
export const STROOP_SECONDS = 30;

/** [indeks kata, indeks warna tinta]. Jawaban benar = warna tintanya, bukan tulisannya. */
export type StroopItem = readonly [number, number];

export function buildStroopSequence(count = 150): StroopItem[] {
  return Array.from({ length: count }, () => {
    const word = rand(0, 3);
    const ink = Math.random() < 0.7 ? (word + rand(1, 3)) % 4 : word;
    return [word, ink] as const;
  });
}

// ─── Cari Angka (dulu Sentuh Angka) ──────────────────

export const ANGKA_SECONDS = 60;

/** [teks perintah, isi papan, angka jawaban]. Jawaban selalu tepat satu di papan. */
export type AngkaRound = readonly [string, number[], number];

const ANGKA_SIZES = [9, 12, 16, 16, 20, 20, 25, 25, 30, 30, 36];
export const angkaCols = (n: number) => (n <= 9 ? 3 : n <= 16 ? 4 : n <= 25 ? 5 : 6);

const digitSum = (n: number) =>
  String(n)
    .split("")
    .reduce((a, d) => a + Number(d), 0);

/** Angka yang mirip target: digit ditukar atau diganti satu. */
function angkaLookalikes(target: number): number[] {
  const s = String(target);
  const out = new Set<number>();
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const a = s.split("");
      [a[i], a[j]] = [a[j], a[i]];
      if (a[0] !== "0") out.add(Number(a.join("")));
    }
    const b = s.split("");
    b[i] = String((Number(s[i]) + rand(1, 9)) % 10);
    if (b[0] !== "0") out.add(Number(b.join("")));
  }
  out.delete(target);
  return [...out];
}

/** Ronde ke-i: makin tinggi papan makin besar, angka makin panjang, perintah makin beragam. */
function buildAngkaRound(i: number): AngkaRound {
  const n = ANGKA_SIZES[Math.min(i, ANGKA_SIZES.length - 1)];
  const hi = i < 3 ? 99 : i < 8 ? 399 : 999;
  const pick = () => rand(10, hi);
  const types =
    i < 3
      ? ["exact"]
      : i < 6
        ? ["exact", "max", "min"]
        : i < 10
          ? ["exact", "max", "min", "kali"]
          : ["exact", "max", "min", "kali", "digit"];
  const type = types[rand(0, types.length - 1)];
  const fill = (cells: Set<number>, allow: (v: number) => boolean) => {
    for (let guard = 0; cells.size < n && guard < 5000; guard++) {
      const v = pick();
      if (allow(v)) cells.add(v);
    }
  };

  if (type === "max" || type === "min") {
    const cells = new Set<number>();
    fill(cells, () => true);
    const arr = [...cells];
    return type === "max"
      ? ["Cari angka TERBESAR", shuffle(arr), Math.max(...arr)]
      : ["Cari angka TERKECIL", shuffle(arr), Math.min(...arr)];
  }
  if (type === "kali") {
    const k = [3, 4, 6, 7, 8, 9][rand(0, 5)];
    let ans = pick();
    while (ans % k !== 0) ans = pick();
    const cells = new Set<number>([ans]);
    fill(cells, (v) => v % k !== 0);
    return [`Cari satu-satunya kelipatan ${k}`, shuffle([...cells]), ans];
  }
  if (type === "digit") {
    const ans = pick();
    const sum = digitSum(ans);
    const cells = new Set<number>([ans]);
    fill(cells, (v) => digitSum(v) !== sum);
    return [`Cari angka yang jumlah digitnya ${sum}`, shuffle([...cells]), ans];
  }
  const target = pick();
  const cells = new Set<number>([target]);
  if (i >= 4) {
    for (const v of shuffle(angkaLookalikes(target)).slice(0, Math.min(n - 1, 2 + Math.floor(i / 2)))) cells.add(v);
  }
  fill(cells, (v) => v !== target);
  return [`Cari angka ${target}`, shuffle([...cells]), target];
}

/** Rangkaian ronde yang sama untuk semua pemain di mode bareng. */
export function buildAngkaRounds(count = 40): AngkaRound[] {
  return Array.from({ length: count }, (_, i) => buildAngkaRound(i));
}

/** Benar: 10 + 2 per level (maks +40) + bonus kecepatan (maks +10, hilang di 5 detik). */
export function angkaPoints(round: number, ms: number): number {
  return 10 + Math.min(round, 20) * 2 + Math.max(0, 10 - Math.floor(ms / 500));
}

// ─── Jumlah Pas ──────────────────────────────────────

export const JUMLAH_SECONDS = 45;

/** [target, angka di papan]. Minimal ada satu pasangan angka yang berjumlah target. */
export type JumlahItem = readonly [number, number[]];

export function buildJumlahSequence(count = 60): JumlahItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = Math.min(12, 6 + Math.floor(i / 5));
    const max = Math.min(60, 12 + i * 2);
    const a = rand(2, max);
    const b = rand(2, max);
    const nums = [a, b];
    while (nums.length < n) nums.push(rand(2, max));
    return [a + b, shuffle(nums)] as const;
  });
}

// ─── Ingat Angka ─────────────────────────────────────

export const INGAT_SECONDS = 75;
export const INGAT_MAX = 12;

/** Satu deret 12 digit per putaran; pemain memakai sebanyak panjang levelnya. */
export function buildIngatPool(count = 30): string[] {
  return Array.from({ length: count }, () => Array.from({ length: INGAT_MAX }, () => rand(0, 9)).join(""));
}

// ─── Banyak Mana ─────────────────────────────────────

export const BANYAK_SECONDS = 30;
export const BANYAK_SLOTS = 30;
export const BANYAK_EMOJI = ["🍎", "⭐", "🐟", "🔵", "🌸", "🐝", "🍪", "🎈"];

/** [jumlah kiri, jumlah kanan, indeks emoji, seed tata letak]. */
export type BanyakItem = readonly [number, number, number, number];

export function buildBanyakSequence(count = 80): BanyakItem[] {
  return Array.from({ length: count }, (_, i) => {
    const diff = Math.max(1, 6 - Math.floor(i / 4));
    const small = rand(8, 22);
    const big = small + diff;
    const leftBig = Math.random() < 0.5;
    return [leftBig ? big : small, leftBig ? small : big, rand(0, BANYAK_EMOJI.length - 1), rand(1, 2 ** 30)] as const;
  });
}

// ─── Arah Terbalik ───────────────────────────────────

export const ARAH_SECONDS = 30;

/** [arah: 0 atas, 1 kanan, 2 bawah, 3 kiri; 1 = aturan "balik arah"]. */
export type ArahItem = readonly [number, number];

export function buildArahSequence(count = 120): ArahItem[] {
  return Array.from({ length: count }, (_, i) => {
    const flip = i < 4 ? 0 : Math.random() < Math.min(0.6, 0.2 + i * 0.015) ? 1 : 0;
    return [rand(0, 3), flip] as const;
  });
}

// ─── Tap Kelipatan ───────────────────────────────────

export const KALI_SECONDS = 45;

/** [k, isi papan]. Tap semua angka yang kelipatan k (3-5 buah). */
export type KaliItem = readonly [number, number[]];

export function buildKaliSequence(count = 60): KaliItem[] {
  return Array.from({ length: count }, (_, i) => {
    const k = [2, 3, 5, 3, 4, 6, 7, 8, 9][Math.min(i, 8)] ?? rand(2, 9);
    const kk = i < 9 ? k : rand(3, 9);
    const n = Math.min(20, 12 + Math.floor(i / 3));
    const hi = Math.min(99, 30 + i * 4);
    const hits = rand(3, 5);
    const cells = new Set<number>();
    for (let g = 0; cells.size < hits && g < 2000; g++) {
      const v = rand(2, hi);
      if (v % kk === 0) cells.add(v);
    }
    for (let g = 0; cells.size < n && g < 4000; g++) {
      const v = rand(2, hi);
      if (v % kk !== 0) cells.add(v);
    }
    return [kk, shuffle([...cells])] as const;
  });
}

// ─── Cek Hitungan ────────────────────────────────────

export const CEK_SECONDS = 30;

/** [persamaan, 1 = benar]. */
export type CekItem = readonly [string, number];

export function buildCekSequence(count = 80): CekItem[] {
  return Array.from({ length: count }, (_, i) => {
    let text: string;
    let res: number;
    const kind = i < 6 ? 0 : rand(0, 2);
    if (kind === 0) {
      const a = rand(10, 20 + i * 3);
      const b = rand(5, 20 + i * 3);
      text = `${a} + ${b}`;
      res = a + b;
    } else if (kind === 1) {
      const a = rand(30, 90 + i);
      const b = rand(5, 29);
      text = `${a} − ${b}`;
      res = a - b;
    } else {
      const a = rand(3, 12);
      const b = rand(3, 12);
      text = `${a} × ${b}`;
      res = a * b;
    }
    const ok = Math.random() < 0.5;
    const off = Math.random() < 0.5 ? 1 : rand(1, i < 10 ? 10 : 3);
    const shown = ok ? res : res + (Math.random() < 0.5 ? -off : off);
    return [`${text} = ${shown}`, shown === res ? 1 : 0] as const;
  });
}

// ─── Cari Kembar ─────────────────────────────────────

export const KEMBAR_SECONDS = 40;
export const KEMBAR_POOL = [
  "🍎", "🍌", "🍇", "🍉", "🍓", "🍒", "🍑", "🥝", "🍍", "🥥", "🥕", "🌽", "🍄", "🌸", "🌻", "🌵", "🌲", "🍀",
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦",
  "🐢", "🐙", "🦋", "🐞", "🐝", "🐳",
];

/** Papan emoji berbeda-beda, kecuali tepat dua yang kembar. */
export function buildKembarSequence(count = 40): string[][] {
  return Array.from({ length: count }, (_, i) => {
    const n = Math.min(30, 12 + Math.floor(i / 2) * 2);
    const pick = shuffle(KEMBAR_POOL).slice(0, n - 1);
    return shuffle([...pick, pick[rand(0, pick.length - 1)]]);
  });
}

// ─── Urut Angka ──────────────────────────────────────

export const URUT_SECONDS = 40;

/** [angka acak, 1 = urutkan dari terbesar]. */
export type UrutItem = readonly [number[], number];

export function buildUrutSequence(count = 40): UrutItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = Math.min(9, 4 + Math.floor(i / 3));
    const hi = i < 4 ? 99 : 999;
    const set = new Set<number>();
    while (set.size < n) set.add(rand(1, hi));
    return [shuffle([...set]), i >= 3 && Math.random() < 0.4 ? 1 : 0] as const;
  });
}


// ─── Pilihan ganda cepat: Huruf Hilang, Lanjut Pola, Selisih Angka ───

/** [soal, pilihan, indeks jawaban benar]. */
export type ChoiceItem = readonly [string, string[], number];

const choice = (prompt: string, answer: string, wrong: string[]): ChoiceItem => {
  const options = shuffle([answer, ...wrong]);
  return [prompt, options, options.indexOf(answer)] as const;
};

export const HURUF_SECONDS = 40;
const HURUF_WORDS = [
  "KOMPUTER", "KEYBOARD", "TIKET", "SPRINT", "DEADLINE", "LAPORAN", "PROYEK", "SERVER", "DATABASE", "JARINGAN",
  "PENGGUNA", "APLIKASI", "PRIORITAS", "KATEGORI", "DOKUMEN", "TESTING", "KLIEN", "PRODUK", "JADWAL", "TARGET",
  "KUALITAS", "LAYANAN", "PELANGGAN", "KEAMANAN", "PERANGKAT", "PEMROGRAMAN", "KOLABORASI", "PRESENTASI", "INVOICE",
  "MONITOR", "PRINTER", "BROWSER", "PASSWORD", "NOTIFIKASI", "LAMPIRAN", "KOMENTAR", "REVISI", "ANGGARAN", "KONTRAK", "RAPAT",
];
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function buildHurufSequence(count = 60): ChoiceItem[] {
  return Array.from({ length: count }, () => {
    const word = HURUF_WORDS[rand(0, HURUF_WORDS.length - 1)];
    const pos = rand(1, word.length - 1);
    const letter = word[pos];
    const wrong = shuffle(ABC.filter((c) => c !== letter)).slice(0, 3);
    const shown = word
      .split("")
      .map((c, i) => (i === pos ? "_" : c))
      .join(" ");
    return choice(shown, letter, wrong);
  });
}

export const LANJUT_SECONDS = 40;
const LANJUT_SHAPES = ["🔴", "🔵", "🟢", "🟡", "🟣", "🟠"];

export function buildLanjutSequence(count = 60): ChoiceItem[] {
  return Array.from({ length: count }, (_, i) => {
    const period = i < 5 ? 2 : i < 12 ? 3 : 4;
    let unit: string[] = [];
    while (new Set(unit).size < 2) unit = Array.from({ length: period }, () => LANJUT_SHAPES[rand(0, LANJUT_SHAPES.length - 1)]);
    const len = period * 2 + rand(0, period - 1);
    const seq = Array.from({ length: len }, (_, k) => unit[k % period]);
    const answer = unit[len % period];
    const wrong = shuffle(LANJUT_SHAPES.filter((s) => s !== answer)).slice(0, 3);
    return choice(`${seq.join(" ")} ❓`, answer, wrong);
  });
}

export const SELISIH_SECONDS = 30;

export function buildSelisihSequence(count = 80): ChoiceItem[] {
  return Array.from({ length: count }, (_, i) => {
    const hi = Math.min(999, 60 + i * 12);
    const b = rand(10, hi);
    const a = b + rand(3, Math.min(hi, 40 + i * 4));
    const diff = a - b;
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const d = diff + rand(-9, 9);
      if (d !== diff && d > 0) wrong.add(d);
    }
    return choice(`Selisih ${a} dan ${b}?`, String(diff), [...wrong].map(String));
  });
}

// ─── Siapa Hilang ────────────────────────────────────

export const HILANG_SECONDS = 40;

/** [emoji yang ditampilkan, indeks yang hilang]. */
export type HilangItem = readonly [string[], number];

export function buildHilangSequence(count = 40): HilangItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = Math.min(9, 4 + Math.floor(i / 3));
    const emojis = shuffle(KEMBAR_POOL).slice(0, n);
    return [emojis, rand(0, n - 1)] as const;
  });
}

// ─── Cari Beda ───────────────────────────────────────

export const BEDA_SECONDS = 30;

/** Pasangan emoji yang mirip; satu jadi "biasa", satu lagi jadi "si beda". */
export const BEDA_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["😀", "😃"],
  ["🌑", "🌚"],
  ["🍎", "🍅"],
  ["🐶", "🐺"],
  ["🔵", "🟣"],
  ["🕐", "🕑"],
  ["🐱", "🐯"],
  ["🍋", "🌕"],
  ["🧡", "❤️"],
  ["🍩", "🧿"],
];

/** Ukuran papan makin besar tiap beberapa soal: 3x3 sampai 6x6. */
export const bedaSize = (i: number) => Math.min(6, 3 + Math.floor(i / 4));

/** [indeks pasangan, 0/1 = emoji mana yang jadi biasa, posisi si beda]. */
export type BedaItem = readonly [number, number, number];

export function buildBedaSequence(count = 60): BedaItem[] {
  return Array.from({ length: count }, (_, i) => {
    const n = bedaSize(i);
    return [rand(0, BEDA_PAIRS.length - 1), rand(0, 1), rand(0, n * n - 1)] as const;
  });
}

// ─── Lebih Besar ─────────────────────────────────────

export const BESAR_SECONDS = 30;

/** [teks kiri, nilai kiri, teks kanan, nilai kanan]. */
export type BesarItem = readonly [string, number, string, number];

function besarSide(level: number): readonly [string, number] {
  if (level === 0) {
    const v = rand(10, 99);
    return [String(v), v];
  }
  const kind = rand(0, level >= 2 ? 2 : 1);
  if (kind === 0) {
    const a = rand(10, 60);
    const b = rand(5, 40);
    return [`${a} + ${b}`, a + b];
  }
  if (kind === 1) {
    const a = rand(3, 12);
    const b = rand(3, 12);
    return [`${a} × ${b}`, a * b];
  }
  const a = rand(60, 150);
  const b = rand(10, 55);
  return [`${a} − ${b}`, a - b];
}

export function buildBesarSequence(count = 80): BesarItem[] {
  return Array.from({ length: count }, (_, i) => {
    const level = Math.min(2, Math.floor(i / 6));
    let l = besarSide(level);
    let r = besarSide(level);
    for (let tries = 0; l[1] === r[1] && tries < 10; tries++) r = besarSide(level);
    if (l[1] === r[1]) l = [String(l[1] + 1), l[1] + 1];
    return [l[0], l[1], r[0], r[1]] as const;
  });
}

// ─── Tebak Gambar ────────────────────────────────────

const DRAW_WORDS = [
  "Kucing", "Rumah", "Pohon", "Matahari", "Sepeda", "Pesawat", "Payung", "Kacamata", "Laptop", "Kopi",
  "Pizza", "Gunung", "Ikan", "Burung", "Mobil", "Kapal", "Bunga", "Bintang", "Jam", "Kunci",
  "Gitar", "Topi", "Sepatu", "Buku", "Telepon", "Kamera", "Robot", "Roket", "Jembatan", "Pelangi",
  "Es krim", "Kura-kura", "Gajah", "Jerapah", "Kelinci", "Ular", "Laba-laba", "Pisang", "Semangka", "Burger",
  "Lampu", "Kursi", "Meja", "Tangga", "Mahkota", "Hantu", "Naga", "Keyboard", "Printer", "Awan",
  "Kalender", "Kalkulator", "Gembok", "Balon", "Kembang api", "Tenda", "Pancing", "Jam pasir", "Sendok", "Kaktus",
  "Kupu-kupu", "Lebah", "Panda", "Pinguin", "Kepiting", "Cumi-cumi", "Pesta", "Hujan", "Salju", "Piala",
];

const EXTRA_DRAW_WORDS = [
  // Benda sehari-hari
  "Kipas angin", "Kulkas", "Mesin cuci", "Setrika", "Vacuum cleaner",
  "Sapu", "Pel", "Bantal", "Kasur", "Selimut",
  "Cermin", "Lemari", "Jam dinding", "Gunting", "Penggaris",
  "Pensil", "Penghapus", "Ransel", "Dompet", "Koper",
  "Botol minum", "Termos", "Payung terbalik", "Korek api", "Lilin",
  "Senter", "Teropong", "Mikroskop", "Teleskop", "Mesin tik",

  // Makanan dan minuman
  "Martabak", "Rendang", "Sate", "Bakso", "Soto",
  "Nasi goreng", "Mie ayam", "Seblak", "Pempek", "Ketoprak",
  "Donat", "Pancake", "Waffle", "Cupcake", "Puding",
  "Popcorn", "Cokelat", "Permen lolipop", "Cotton candy", "Roti tawar",
  "Keju", "Telur ceplok", "Sushi", "Ramen", "Hot dog",
  "Kentang goreng", "Taco", "Spaghetti", "Dimsum", "Kebab",
  "Jus jeruk", "Susu", "Bubble tea", "Air kelapa", "Es teh",
  "Durian", "Mangga", "Nanas", "Anggur", "Stroberi",

  // Hewan
  "Singa", "Harimau", "Zebra", "Monyet", "Gorila",
  "Koala", "Kanguru", "Beruang", "Serigala", "Rubah",
  "Rusa", "Kuda", "Sapi", "Kambing", "Domba",
  "Ayam", "Bebek", "Angsa", "Burung hantu", "Merak",
  "Flamingo", "Elang", "Burung beo", "Lumba-lumba", "Paus",
  "Hiu", "Gurita", "Ubur-ubur", "Bintang laut", "Kuda laut",
  "Katak", "Buaya", "Bunglon", "Kelelawar", "Landak",
  "Siput", "Cacing", "Nyamuk", "Capung", "Belalang",

  // Alam dan cuaca
  "Gunung meletus", "Air terjun", "Pantai", "Gurun pasir", "Hutan",
  "Pulau", "Gua", "Danau", "Sungai", "Pelangi ganda",
  "Tornado", "Petir", "Gempa bumi", "Banjir", "Ombak",
  "Gunung es", "Pohon kelapa", "Bunga matahari", "Bunga mawar", "Jamur",
  "Daun gugur", "Api unggun", "Bulan sabit", "Gerhana matahari", "Bintang jatuh",

  // Transportasi
  "Helikopter", "Kapal selam", "Kereta api", "Kereta cepat", "Truk",
  "Ambulans", "Mobil pemadam kebakaran", "Becak", "Delman", "Bajaj",
  "Skateboard", "Roller skate", "Balon udara", "Parasut", "Jet ski",
  "Kapal bajak laut", "Traktor", "Forklift", "Pesawat tempur", "Kereta gantung",

  // Profesi
  "Dokter", "Perawat", "Guru", "Polisi", "Pemadam kebakaran",
  "Koki", "Astronaut", "Pilot", "Nelayan", "Petani",
  "Penyanyi", "Penari", "Pelukis", "Fotografer", "Programmer",
  "Detektif", "Pesulap", "Badut", "Arkeolog", "Montir",
  "Dokter gigi", "Wasit", "Kondektur", "Presenter", "Youtuber",

  // Olahraga dan aktivitas
  "Sepak bola", "Bola basket", "Bulu tangkis", "Tenis meja", "Tinju",
  "Bersepeda", "Memancing", "Berenang", "Mendaki gunung", "Berselancar",
  "Bermain layangan", "Lompat tali", "Angkat besi", "Panahan", "Bowling",
  "Bermain catur", "Bermain gitar", "Karaoke", "Berkemah", "Yoga",

  // Tempat dan bangunan
  "Rumah sakit", "Sekolah", "Perpustakaan", "Bandara", "Stasiun",
  "Pasar", "Mal", "Bioskop", "Restoran", "Hotel",
  "Istana", "Mercusuar", "Menara Eiffel", "Candi", "Masjid",
  "Gereja", "Museum", "Kebun binatang", "Akuarium", "Taman bermain",
  "Rumah pohon", "Rumah hantu", "Kastil", "Penjara", "Laboratorium",

  // Teknologi
  "Drone", "Headphone", "Joystick", "Mouse komputer", "Flashdisk",
  "Hard disk", "Smartwatch", "Konsol game", "VR headset", "Proyektor",
  "Kamera CCTV", "Router Wi-Fi", "Power bank", "Charger", "Mikrofon",
  "Speaker", "Kartu memori", "Mesin ATM", "Robot vacuum", "Mesin kasir",

  // Fantasi dan karakter
  "Putri duyung", "Peri", "Vampir", "Zombie", "Manusia serigala",
  "Penyihir", "Penyihir terbang", "Alien", "Monster", "Unicorn",
  "Phoenix", "Centaur", "Raksasa", "Kurcaci", "Malaikat",
  "Iblis", "Superhero", "Ninja", "Samurai", "Ksatria",
  "Bajak laut", "Mumi", "Raja", "Ratu", "Pangeran",

  // Benda dan konsep unik
  "Mesin waktu", "Kotak harta karun", "Lampu ajaib", "Cincin ajaib",
  "Pintu rahasia", "Kapal luar angkasa", "Portal dimensi", "Mesin teleportasi",
  "Kartu remi", "Dadu", "Domino", "Puzzle", "Boneka",
  "Boneka salju", "Orang-orangan sawah", "Patung", "Topeng", "Lonceng",
  "Terompet", "Drum", "Biola", "Piano", "Harmonika",
  "Bola kristal", "Kaca pembesar", "Kompas", "Peta harta karun", "Kapal dalam botol",

  // Ekspresi dan situasi lucu
  "Orang mengantuk", "Orang bersin", "Orang tersandung", "Orang menangis",
  "Orang tertawa", "Orang jatuh cinta", "Orang kebingungan", "Orang kepanasan",
  "Orang kedinginan", "Orang ketakutan", "Orang sedang ngambek",
  "Orang lupa ingatan", "Orang kesiangan", "Orang dikejar ayam",
  "Kucing mencuri ikan", "Monyet makan pisang", "Ayam naik motor",
  "Bebek memakai sepatu", "Sapi bermain gitar", "Gajah naik sepeda",
  "Pinguin bermain ski", "Ikan terbang", "Hantu bermain HP",
  "Zombie pergi ke sekolah", "Alien makan bakso",
  "Robot sedang tidur", "Naga menyemburkan api", "Kambing memanjat pohon",
  "Anjing memakai kacamata", "Kelinci bermain basket",

  // Pakaian dan aksesori
  "Jas hujan", "Dasi", "Dasi kupu-kupu", "Kemeja", "Gaun pengantin",
  "Kebaya", "Sarung", "Batik", "Kaos kaki", "Sarung tangan",
  "Helm", "Mahkota bunga", "Anting-anting", "Kalung", "Gelang",
  "Cincin kawin", "Kacamata hitam", "Syal", "Sepatu roda", "Sandal jepit",

  // Benda khas Indonesia
  "Angklung", "Gamelan", "Wayang kulit", "Keris", "Tifa",
  "Rumah gadang", "Rumah joglo", "Monas", "Borobudur", "Prambanan",
  "Ondel-ondel", "Kuda lumping", "Reog Ponorogo", "Batik tulis", "Tumpeng",
  "Ketupat", "Lemper", "Klepon", "Onde-onde", "Kerupuk",
  "Gerobak bakso", "Warung kopi", "Pos ronda", "Gapura", "Becak motor"
];

/** Gabungan semua kata, tanpa duplikat (huruf besar/kecil diabaikan). */
const ALL_DRAW_WORDS = Array.from(
  new Map([...DRAW_WORDS, ...EXTRA_DRAW_WORDS].map((w) => [w.toLowerCase(), w])).values(),
);

/** Satu kata per ronde, tidak berulang selama kata masih cukup. */
export function buildDrawWords(count: number): string[] {
  const out: string[] = [];
  while (out.length < count) out.push(...shuffle(ALL_DRAW_WORDS));
  return out.slice(0, count);
}

export const DRAW_CHOICES = 3;

/** Pilihan kata tiap ronde (tidak ada kata yang muncul dua kali selama kata masih cukup). */
export function buildDrawChoices(rounds: number): string[][] {
  const flat = buildDrawWords(rounds * DRAW_CHOICES);
  return Array.from({ length: rounds }, (_, r) => flat.slice(r * DRAW_CHOICES, (r + 1) * DRAW_CHOICES));
}

/** Samakan tebakan dan kata: abaikan huruf besar/kecil, spasi, dan tanda baca. */
export const normalizeGuess = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Petunjuk "_ _ _ _"; huruf pertama dibuka kalau `reveal`. */
export function drawHint(word: string, reveal: boolean): string {
  return word
    .split("")
    .map((ch, i) => (/[a-z0-9]/i.test(ch) ? (reveal && i === 0 ? ch.toUpperCase() : "_") : ch === " " ? "  " : ch))
    .join(" ");
}

// ─── Sandi Rahasia (Mastermind) ──────────────────────

export const SANDI_COLORS = ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"] as const;
export const SANDI_LEN = 4;
export const SANDI_CODES = 3;
export const SANDI_MAX_TRIES = 10;
export const SANDI_SECONDS = 180;

/** 3 sandi rahasia (4 warna, boleh berulang); sama untuk semua pemain. */
export function buildSandiCodes(): number[][] {
  return Array.from({ length: SANDI_CODES }, () =>
    Array.from({ length: SANDI_LEN }, () => rand(0, SANDI_COLORS.length - 1)),
  );
}

/** exact = warna & posisi pas, partial = warna ada tapi posisi salah. */
export function scoreSandi(code: number[], guess: number[]): { exact: number; partial: number } {
  let exact = 0;
  const left = Array<number>(SANDI_COLORS.length).fill(0);
  const mine = Array<number>(SANDI_COLORS.length).fill(0);
  for (let i = 0; i < SANDI_LEN; i++) {
    if (code[i] === guess[i]) exact++;
    else {
      left[code[i]]++;
      mine[guess[i]]++;
    }
  }
  let partial = 0;
  for (let c = 0; c < left.length; c++) partial += Math.min(left[c], mine[c]);
  return { exact, partial };
}

/** Makin sedikit percobaan & makin cepat, makin besar poinnya. */
export const sandiPoints = (tries: number, secondsLeft: number) =>
  100 + (SANDI_MAX_TRIES - tries + 1) * 25 + Math.round((Math.max(0, secondsLeft) / SANDI_SECONDS) * 100);

// ─── Labirin Kilat ───────────────────────────────────

export const MAZE_SIZE = 15;
export const MAZE_SECONDS = 90;
export const MAZE_N = 1;
export const MAZE_E = 2;
export const MAZE_S = 4;
export const MAZE_W = 8;

/** Labirin sempurna (DFS). Tiap sel = bitmask sisi yang terbuka. Mulai di sel 0, finish di sel terakhir. */
export function buildMaze(size = MAZE_SIZE): number[] {
  const cells = Array<number>(size * size).fill(0);
  const seen = Array<boolean>(size * size).fill(false);
  const stack = [0];
  seen[0] = true;
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const r = Math.floor(cur / size);
    const c = cur % size;
    const opts: Array<[number, number, number]> = [];
    if (r > 0 && !seen[cur - size]) opts.push([cur - size, MAZE_N, MAZE_S]);
    if (c < size - 1 && !seen[cur + 1]) opts.push([cur + 1, MAZE_E, MAZE_W]);
    if (r < size - 1 && !seen[cur + size]) opts.push([cur + size, MAZE_S, MAZE_N]);
    if (c > 0 && !seen[cur - 1]) opts.push([cur - 1, MAZE_W, MAZE_E]);
    if (opts.length === 0) {
      stack.pop();
      continue;
    }
    const [next, here, there] = opts[rand(0, opts.length - 1)];
    cells[cur] |= here;
    cells[next] |= there;
    seen[next] = true;
    stack.push(next);
  }
  return cells;
}

/** Sel tujuan kalau bergerak ke arah tertentu; sel yang sama kalau terhalang dinding. */
export function mazeStep(maze: number[], pos: number, dir: "U" | "D" | "L" | "R", size = MAZE_SIZE): number {
  const bit = { U: MAZE_N, R: MAZE_E, D: MAZE_S, L: MAZE_W }[dir];
  if (!(maze[pos] & bit)) return pos;
  return pos + { U: -size, R: 1, D: size, L: -1 }[dir];
}

/** Jarak langkah dari tiap sel ke finish (BFS). */
export function mazeDistances(maze: number[], size = MAZE_SIZE): number[] {
  const dist = Array<number>(size * size).fill(-1);
  const goal = size * size - 1;
  dist[goal] = 0;
  const queue = [goal];
  for (let q = 0; q < queue.length; q++) {
    const cur = queue[q];
    for (const dir of ["U", "D", "L", "R"] as const) {
      const nx = mazeStep(maze, cur, dir, size);
      if (nx !== cur && dist[nx] < 0) {
        dist[nx] = dist[cur] + 1;
        queue.push(nx);
      }
    }
  }
  return dist;
}

// ─── Hitung 24 ───────────────────────────────────────

export const DUA4_SECONDS = 150;
export const DUA4_PUZZLES = 6;

function canMake24(nums: number[]): boolean {
  if (nums.length === 1) return Math.abs(nums[0] - 24) < 1e-6;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      const rest = nums.filter((_, k) => k !== i && k !== j);
      const a = nums[i];
      const b = nums[j];
      const results = [a + b, a * b, a - b, b - a];
      if (b !== 0) results.push(a / b);
      if (a !== 0) results.push(b / a);
      if (results.some((v) => canMake24([...rest, v]))) return true;
    }
  }
  return false;
}

/** Soal berisi 4 angka (1-9) yang dijamin bisa dijadikan 24. */
export function buildDua4Puzzles(): number[][] {
  const out: number[][] = [];
  while (out.length < DUA4_PUZZLES) {
    const nums = Array.from({ length: 4 }, () => rand(1, 9));
    if (canMake24(nums)) out.push(nums);
  }
  return out;
}

/** Hitung ekspresi (+ − × ÷ dan kurung). null kalau tidak valid atau membagi nol. */
export function evalExpr(tokens: string[]): number | null {
  let p = 0;
  let bad = false;
  const expr = (): number => {
    let v = term();
    while (tokens[p] === "+" || tokens[p] === "-") {
      const op = tokens[p++];
      const r = term();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  const term = (): number => {
    let v = factor();
    while (tokens[p] === "*" || tokens[p] === "/") {
      const op = tokens[p++];
      const r = factor();
      if (op === "/" && r === 0) bad = true;
      v = op === "*" ? v * r : r === 0 ? 0 : v / r;
    }
    return v;
  };
  const factor = (): number => {
    const t = tokens[p++];
    if (t === "(") {
      const v = expr();
      if (tokens[p++] !== ")") bad = true;
      return v;
    }
    if (t !== undefined && /^\d+$/.test(t)) return Number(t);
    bad = true;
    return 0;
  };
  const value = expr();
  return bad || p !== tokens.length || !Number.isFinite(value) ? null : value;
}

// ─── Ketik Kata ──────────────────────────────────────

export const KETIK_SECONDS = 45;

const KETIK_WORDS = [
  "kopi", "laptop", "server", "kolaborasi", "deadline", "rapat", "laporan", "prioritas", "jaringan", "keyboard",
  "semangat", "proyek", "klien", "desain", "produk", "strategi", "presentasi", "koordinasi", "evaluasi", "inovasi",
  "database", "aplikasi", "internet", "browser", "monitor", "password", "backend", "frontend", "sprint", "review",
  "testing", "deploy", "pelanggan", "marketing", "keuangan", "anggaran", "jadwal", "target", "capaian", "kinerja",
  "karyawan", "manajer", "direktur", "kantor", "meja", "kursi", "printer", "scanner", "proyektor", "dokumen",
  "arsip", "folder", "surel", "pesan", "telepon", "kamera", "mikrofon", "speaker", "baterai", "pengisi",
  "pelatihan", "seminar", "workshop", "diskusi", "usulan", "keputusan", "tanggung", "jawab", "disiplin", "teliti",
  "cepat", "tepat", "lembur", "libur", "cuti", "gajian", "bonus", "tunjangan", "asuransi", "kontrak",
  "negosiasi", "penawaran", "faktur", "pembayaran", "pengiriman", "gudang", "stok", "pemasok", "distribusi", "layanan",
];

export function buildKetikWords(count = 90): string[] {
  const out: string[] = [];
  while (out.length < count) out.push(...shuffle(KETIK_WORDS));
  return out.slice(0, count);
}

/** 10 poin per huruf, +20 kalau diketik tanpa salah. */
export const ketikPoints = (word: string, clean: boolean) => word.length * 10 + (clean ? 20 : 0);

// ─── Tangkap Buah ────────────────────────────────────

export const BUAH_SECONDS = 40;
export const BUAH_FRUITS = ["🍎", "🍌", "🍇", "🍉", "🍊", "🍓"];

/** [muncul pada ms ke-N, posisi x (6-94 %), jenis (0 buah, 1 bintang emas, 2 bom), variasi emoji]. */
export type BuahItem = readonly [number, number, number, number];

export function buildBuahSchedule(): BuahItem[] {
  const out: BuahItem[] = [];
  let t = 600;
  while (t < BUAH_SECONDS * 1000 - 1500) {
    const r = Math.random();
    out.push([Math.round(t), rand(6, 94), r < 0.18 ? 2 : r < 0.28 ? 1 : 0, rand(0, BUAH_FRUITS.length - 1)] as const);
    t += Math.max(280, 620 - t * 0.007) + rand(0, 160);
  }
  return out;
}

/** Lama jatuh (ms); makin lama permainan makin cepat. */
export const buahFall = (at: number) => Math.max(1300, 2600 - at * 0.03);

// ─── Tebak Angka ─────────────────────────────────────

export const TEBAK_ROUNDS = 3;
export const TEBAK_MAX_GUESSES = 7;
/** Batas waktu total di mode bareng (solo tanpa batas waktu). */
export const TEBAK_SECONDS = 120;

/** Angka rahasia tiap ronde (1-100); sama untuk semua pemain di mode bareng. */
export function buildTebakSecrets(): number[] {
  return Array.from({ length: TEBAK_ROUNDS }, () => rand(1, 100));
}

/** Benar = 100 + 50 per sisa tebakan. */
export const tebakScore = (guessesUsed: number) => 100 + (TEBAK_MAX_GUESSES - guessesUsed) * 50;

// ─── Lampu Padam ─────────────────────────────────────

export const LAMPU_SIZE = 4;
export const LAMPU_BOARDS = 3;
export const LAMPU_SECONDS = 120;

/** Balik lampu i beserta tetangga atas, bawah, kiri, kanan. */
export function lampuPress(board: boolean[], i: number): boolean[] {
  const next = [...board];
  const r = Math.floor(i / LAMPU_SIZE);
  const c = i % LAMPU_SIZE;
  for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < LAMPU_SIZE && cc >= 0 && cc < LAMPU_SIZE) next[rr * LAMPU_SIZE + cc] = !next[rr * LAMPU_SIZE + cc];
  }
  return next;
}

/** Papan acak yang pasti bisa diselesaikan: mulai dari padam, lalu tekan acak. */
export function buildLampuBoard(): boolean[] {
  for (;;) {
    let board: boolean[] = Array(LAMPU_SIZE * LAMPU_SIZE).fill(false);
    const cells = shuffle(Array.from({ length: LAMPU_SIZE * LAMPU_SIZE }, (_, i) => i));
    for (const i of cells.slice(0, rand(5, 8))) board = lampuPress(board, i);
    if (board.some(Boolean)) return board;
  }
}

/** Papan untuk mode bareng, dikirim sebagai 0/1. */
export const buildLampuBoards = (): number[][] =>
  Array.from({ length: LAMPU_BOARDS }, () => buildLampuBoard().map(Number));

/** Papan padam = 150 + bonus sedikit langkah (maks +60). */
export const lampuBoardScore = (moves: number) => 150 + Math.max(0, 60 - moves * 3);

// ─── Puzzle Geser ────────────────────────────────────

export const GESER_N = 3;
export const GESER_SECONDS = 120;
export const GESER_SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function geserNeighbours(blank: number): number[] {
  const r = Math.floor(blank / GESER_N);
  const c = blank % GESER_N;
  const out: number[] = [];
  if (r > 0) out.push(blank - GESER_N);
  if (r < GESER_N - 1) out.push(blank + GESER_N);
  if (c > 0) out.push(blank - 1);
  if (c < GESER_N - 1) out.push(blank + 1);
  return out;
}

/** Acak lewat gerakan legal dari kondisi selesai, jadi pasti bisa dipecahkan. */
export function buildGeserBoard(): number[] {
  for (;;) {
    const t = [...GESER_SOLVED];
    let blank = 8;
    let prev = -1;
    for (let k = 0; k < 90; k++) {
      const options = geserNeighbours(blank).filter((p) => p !== prev);
      const pick = options[Math.floor(Math.random() * options.length)];
      t[blank] = t[pick];
      t[pick] = 0;
      prev = blank;
      blank = pick;
    }
    if (t.some((v, i) => v !== GESER_SOLVED[i])) return t;
  }
}

export const geserCorrect = (t: number[]) => t.filter((v, i) => v !== 0 && v === GESER_SOLVED[i]).length;

/** Selesai = 400 + 4 per detik tersisa + bonus sedikit langkah (maks +200). */
export const geserSolveScore = (secsLeft: number, moves: number) =>
  400 + Math.max(0, secsLeft) * 4 + Math.max(0, 200 - moves * 2);

// ─── Tebak Petunjuk ──────────────────────────────────

export const PETUNJUK_ROUNDS = 8;
/** Lama tiap ronde; petunjuk ke-2 dan ke-3 terbuka tiap PETUNJUK_REVEAL_MS. */
export const PETUNJUK_ROUND_MS = 24_000;
export const PETUNJUK_REVEAL_MS = 8_000;

export interface PetunjukItem {
  answer: string;
  /** Jawaban lain yang diterima. */
  alt: string[];
  /** Tiga petunjuk satu kata: dari yang paling samar ke yang paling jelas. */
  clues: [string, string, string];
}

const P = (answer: string, clues: [string, string, string], alt: string[] = []): PetunjukItem => ({ answer, alt, clues });

export const PETUNJUK_BANK: PetunjukItem[] = [
  P("Kulkas", ["Dapur", "Dingin", "Es"], ["lemari es", "refrigerator"]),
  P("Payung", ["Gagang", "Basah", "Hujan"]),
  P("Sepeda", ["Roda", "Pedal", "Dikayuh"]),
  P("Kacamata", ["Hidung", "Lensa", "Mata"], ["kaca mata"]),
  P("Jam", ["Angka", "Jarum", "Waktu"], ["jam dinding", "jam tangan"]),
  P("Pisang", ["Kuning", "Kupas", "Monyet"]),
  P("Bulan", ["Malam", "Purnama", "Satelit"]),
  P("Matahari", ["Panas", "Siang", "Terbit"]),
  P("Pesawat", ["Sayap", "Bandara", "Terbang"], ["pesawat terbang"]),
  P("Kereta", ["Rel", "Stasiun", "Gerbong"], ["kereta api"]),
  P("Gitar", ["Senar", "Petik", "Musik"]),
  P("Kamera", ["Lensa", "Foto", "Jepret"]),
  P("Laptop", ["Layar", "Keyboard", "Portabel"], ["notebook"]),
  P("Printer", ["Kertas", "Tinta", "Cetak"]),
  P("Mouse", ["Kursor", "Klik", "Tikus"], ["tetikus"]),
  P("Sendok", ["Garpu", "Makan", "Sup"]),
  P("Kunci", ["Logam", "Gembok", "Pintu"]),
  P("Gunting", ["Tajam", "Kertas", "Potong"]),
  P("Pensil", ["Grafit", "Penghapus", "Tulis"]),
  P("Sapu", ["Ijuk", "Debu", "Lantai"]),
  P("Kasur", ["Empuk", "Bantal", "Tidur"], ["tempat tidur", "ranjang"]),
  P("Tangga", ["Anak", "Naik", "Pijakan"]),
  P("Lilin", ["Lelehan", "Sumbu", "Api"]),
  P("Cermin", ["Pantulan", "Wajah", "Kaca"]),
  P("Balon", ["Karet", "Udara", "Meletus"]),
  P("Roti", ["Tepung", "Oven", "Sarapan"]),
  P("Telur", ["Cangkang", "Ayam", "Dadar"]),
  P("Semangka", ["Hijau", "Biji", "Merah"]),
  P("Es Krim", ["Cone", "Meleleh", "Dingin"], ["eskrim", "ice cream"]),
  P("Kopi", ["Pahit", "Kafein", "Cangkir"]),
  P("Pizza", ["Italia", "Bulat", "Keju"]),
  P("Gajah", ["Besar", "Gading", "Belalai"]),
  P("Jerapah", ["Afrika", "Tinggi", "Leher"]),
  P("Pinguin", ["Kutub", "Es", "Burung"]),
  P("Lebah", ["Sengat", "Madu", "Sarang"]),
  P("Kucing", ["Kumis", "Cakar", "Meong"]),
  P("Spidol", ["Papan", "Tinta", "Tulis"]),
  P("Kalkulator", ["Angka", "Tombol", "Hitung"]),
  P("Proyektor", ["Cahaya", "Layar", "Presentasi"], ["infocus", "lcd"]),
  P("Dispenser", ["Galon", "Air", "Panas"]),
  P("Tas", ["Punggung", "Resleting", "Bawa"], ["ransel"]),
  P("Sepatu", ["Kaki", "Tali", "Sol"]),
  P("Mobil", ["Roda", "Bensin", "Setir"]),
  P("Helm", ["Pengaman", "Motor", "Kepala"]),
  P("Telepon", ["Dering", "Nomor", "Halo"], ["telpon", "hp", "handphone"]),
  P("Remote", ["Baterai", "Tombol", "Televisi"], ["remot"]),
  P("Kipas", ["Baling", "Berputar", "Angin"], ["kipas angin"]),
  P("Setrika", ["Panas", "Licin", "Baju"]),
  P("Termos", ["Vakum", "Botol", "Panas"]),
];

/** Indeks objek untuk satu permainan; dikirim host supaya sama untuk semua pemain. */
export const buildPetunjukPicks = (): number[] =>
  shuffle(PETUNJUK_BANK.map((_, i) => i)).slice(0, PETUNJUK_ROUNDS);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Spasi/huruf besar diabaikan; salah ketik 1 huruf dimaafkan untuk kata >= 5 huruf. */
export function isPetunjukCorrect(guess: string, item: PetunjukItem): boolean {
  const g = norm(guess);
  if (!g) return false;
  return [item.answer, ...item.alt].some((a) => {
    const n = norm(a);
    return g === n || (n.length >= 5 && withinOneEdit(g, n));
  });
}

/** Makin sedikit petunjuk terbuka, makin besar poin. Tiap tebakan salah -10 (minimal 50). */
export const petunjukPoints = (cluesShown: number, wrong: number) =>
  Math.max(50, [300, 200, 120][Math.min(Math.max(cluesShown, 1), 3) - 1] - wrong * 10);

// ─── Kuis bahasa & dunia (dipakai QuizBattle) ────────

type QuizKind = "antonim" | "peribahasa" | "ibukota";

function quizQuestion(kind: QuizKind, prompt: string, hint: string, answer: string, wrong: readonly string[]): ContentQuestion {
  const options = shuffle([answer, ...wrong]);
  return { kind, prompt, hint, options, answer: options.indexOf(answer) };
}

/** Pasangan [kata, lawan kata]; dipilih supaya jawaban pasangan lain tidak bisa dianggap benar. */
const ANTONIM: ReadonlyArray<readonly [string, string]> = [
  ["Besar", "Kecil"], ["Panjang", "Pendek"], ["Naik", "Turun"], ["Siang", "Malam"], ["Panas", "Dingin"],
  ["Cepat", "Lambat"], ["Berat", "Ringan"], ["Terang", "Gelap"], ["Kaya", "Miskin"], ["Rajin", "Malas"],
  ["Buka", "Tutup"], ["Senang", "Sedih"], ["Mudah", "Sulit"], ["Kering", "Basah"], ["Jauh", "Dekat"],
  ["Tebal", "Tipis"], ["Maju", "Mundur"], ["Awal", "Akhir"], ["Ramai", "Sepi"], ["Masuk", "Keluar"],
  ["Kuat", "Lemah"], ["Bersih", "Kotor"], ["Pintar", "Bodoh"], ["Dalam", "Dangkal"],
];

export function buildAntonimQuestions(count = 10): ContentQuestion[] {
  return shuffle(ANTONIM)
    .slice(0, count)
    .map(([word, answer]) =>
      quizQuestion(
        "antonim",
        word.toUpperCase(),
        "Pilih lawan katanya",
        answer,
        shuffle(ANTONIM.filter(([w]) => w !== word)).slice(0, 3).map(([, a]) => a),
      ),
    );
}

const PERIBAHASA: Item[] = [
  ["Air tenang …", "menghanyutkan", ["menenggelamkan", "menyegarkan", "mengalir deras"]],
  ["Berakit-rakit ke hulu, …", "berenang-renang ke tepian", ["berlari-lari ke hilir", "berjalan-jalan ke pantai", "berlayar-layar ke muara"]],
  ["Sedia payung …", "sebelum hujan", ["sesudah hujan", "saat terik", "di musim kemarau"]],
  ["Tong kosong …", "nyaring bunyinya", ["berat isinya", "tak berbunyi", "mudah pecah"]],
  ["Rajin pangkal …", "pandai", ["cantik", "tinggi", "lelah"]],
  ["Ada gula ada …", "semut", ["lebah", "kupu-kupu", "lalat"]],
  ["Sekali merengkuh dayung, …", "dua tiga pulau terlampaui", ["sampai ke seberang", "perahu tenggelam", "angin pun reda"]],
  ["Bersatu kita teguh, …", "bercerai kita runtuh", ["berpisah kita kuat", "sendiri kita menang", "berbeda kita maju"]],
  ["Gajah di pelupuk mata tidak tampak, …", "semut di seberang lautan tampak", ["kuman di seberang lautan terlihat", "tikus di lumbung terlihat", "burung di dahan tampak"]],
  ["Sambil menyelam …", "minum air", ["mencari mutiara", "menahan napas", "berenang jauh"]],
  ["Buah jatuh tidak jauh dari …", "pohonnya", ["tanahnya", "akarnya", "kebunnya"]],
  ["Seperti pinang dibelah …", "dua", ["tiga", "empat", "tengah"]],
  ["Malu bertanya, …", "sesat di jalan", ["tak punya teman", "lupa jalan pulang", "rugi waktu"]],
  ["Di mana bumi dipijak, …", "di situ langit dijunjung", ["di situ rumah dibangun", "di situ kita makan", "di situ air diminum"]],
  ["Lain ladang lain …", "belalang", ["rumput", "hujan", "padi"]],
  ["Tak ada gading yang …", "tak retak", ["tak mahal", "tak indah", "tak tajam"]],
  ["Habis manis sepah …", "dibuang", ["dimakan", "disimpan", "dijual"]],
  ["Bagai kacang lupa …", "akan kulitnya", ["pada tanahnya", "akan akarnya", "dengan petaninya"]],
  ["Ringan sama dijinjing, berat sama …", "dipikul", ["diangkat", "dibuang", "diseret"]],
  ["Pagar makan …", "tanaman", ["rumput", "pemilik", "kebun"]],
];

export function buildPeribahasaQuestions(count = 10): ContentQuestion[] {
  return shuffle(PERIBAHASA)
    .slice(0, count)
    .map(([prompt, answer, wrong]) => quizQuestion("peribahasa", prompt, "Lengkapi peribahasanya", answer, wrong));
}

const IBUKOTA: ReadonlyArray<readonly [string, string]> = [
  ["Indonesia", "Jakarta"], ["Malaysia", "Kuala Lumpur"], ["Thailand", "Bangkok"], ["Vietnam", "Hanoi"],
  ["Filipina", "Manila"], ["Jepang", "Tokyo"], ["Korea Selatan", "Seoul"], ["Tiongkok", "Beijing"],
  ["India", "New Delhi"], ["Australia", "Canberra"], ["Selandia Baru", "Wellington"], ["Prancis", "Paris"],
  ["Jerman", "Berlin"], ["Italia", "Roma"], ["Spanyol", "Madrid"], ["Inggris", "London"],
  ["Belanda", "Amsterdam"], ["Mesir", "Kairo"], ["Arab Saudi", "Riyadh"], ["Turki", "Ankara"],
  ["Rusia", "Moskow"], ["Kanada", "Ottawa"], ["Brasil", "Brasilia"], ["Argentina", "Buenos Aires"],
  ["Kenya", "Nairobi"], ["Portugal", "Lisabon"], ["Swedia", "Stockholm"], ["Yunani", "Athena"],
];

export function buildIbukotaQuestions(count = 10): ContentQuestion[] {
  return shuffle(IBUKOTA)
    .slice(0, count)
    .map(([country, answer]) =>
      quizQuestion(
        "ibukota",
        `Ibu kota ${country}?`,
        "Geografi dunia",
        answer,
        shuffle(IBUKOTA.filter(([c]) => c !== country)).slice(0, 3).map(([, cap]) => cap),
      ),
    );
}

// ─── Bidik Cepat ─────────────────────────────────────

export const BIDIK_SECONDS = 30;

/** [muncul pada ms ke-N, x (8-92 %), y (10-90 %), lama tampil ms, jenis (0 biasa, 1 emas, 2 bom)]. */
export type BidikTarget = readonly [number, number, number, number, number];

export function buildBidikSchedule(): BidikTarget[] {
  const out: BidikTarget[] = [];
  let t = 500;
  while (t < BIDIK_SECONDS * 1000 - 900) {
    const r = Math.random();
    const life = Math.max(900, Math.round(1600 - t * 0.024));
    out.push([Math.round(t), rand(8, 92), rand(10, 90), life, r < 0.14 ? 2 : r < 0.24 ? 1 : 0] as const);
    t += Math.max(280, 520 - t * 0.008) + rand(0, 120);
  }
  return out;
}

/** Biasa 10-20 (makin cepat makin besar), emas 30-50, bom -20. */
export function bidikPoints(kind: number, remainingFraction: number): number {
  if (kind === 2) return -20;
  const f = Math.max(0, Math.min(1, remainingFraction));
  return kind === 1 ? 30 + Math.round(f * 20) : 10 + Math.round(f * 10);
}

// ─── Pola Angka, Singkatan, Fakta/Mitos (dipakai QuizBattle) ───

type QuizKind2 = "pola" | "singkatan" | "fakta";

function quizQuestion2(kind: QuizKind2, prompt: string, hint: string, options: string[], answerIdx: number): ContentQuestion {
  return { kind, prompt, hint, options, answer: answerIdx };
}

/** Soal ke-i (0-9): makin besar i makin sulit polanya. */
function polaQuestion(i: number): ContentQuestion {
  let terms: number[];
  if (i < 4) {
    const start = rand(1, 20);
    const d = rand(2, 9);
    terms = Array.from({ length: 6 }, (_, k) => start + d * k);
  } else if (i < 7) {
    const start = rand(1, 4);
    const r = rand(2, 3);
    terms = Array.from({ length: 6 }, (_, k) => start * r ** k);
  } else if (i === 7) {
    const n = rand(1, 5);
    terms = Array.from({ length: 6 }, (_, k) => (n + k) ** 2);
  } else if (i === 8) {
    const t: number[] = [rand(1, 4), rand(1, 4)];
    while (t.length < 6) t.push(t[t.length - 1] + t[t.length - 2]);
    terms = t;
  } else {
    const start = rand(1, 10);
    const a = rand(2, 5);
    const b = rand(6, 9);
    terms = [start];
    for (let k = 0; k < 5; k++) terms.push(terms[k] + (k % 2 === 0 ? a : b));
  }
  const answer = terms[5];
  const spread = Math.max(3, Math.round(answer * 0.15));
  const wrong = new Set<number>();
  while (wrong.size < 3) {
    const v = answer + rand(1, spread) * (Math.random() < 0.5 ? -1 : 1);
    if (v !== answer && v > 0) wrong.add(v);
  }
  const options = shuffle([answer, ...wrong]).map(String);
  return quizQuestion2("pola", `${terms.slice(0, 5).join(", ")}, ?`, "Lanjutkan pola angkanya", options, options.indexOf(String(answer)));
}

export function buildPolaQuestions(count = 10): ContentQuestion[] {
  return Array.from({ length: count }, (_, i) => polaQuestion(i));
}

const SINGKATAN: Item[] = [
  ["CPU", "Central Processing Unit", ["Central Program Utility", "Computer Personal Unit", "Control Processing Update"]],
  ["RAM", "Random Access Memory", ["Read Access Memory", "Rapid Application Module", "Random Application Memory"]],
  ["URL", "Uniform Resource Locator", ["Universal Resource Link", "Unified Reference Locator", "User Resource Location"]],
  ["HTML", "HyperText Markup Language", ["HighText Machine Language", "Hyperlink Text Mode Language", "HyperTool Markup Logic"]],
  ["USB", "Universal Serial Bus", ["United System Bus", "Universal Storage Block", "Unique Serial Binary"]],
  ["PDF", "Portable Document Format", ["Printable Data File", "Personal Document Form", "Portable Data Folder"]],
  ["GPS", "Global Positioning System", ["General Position Signal", "Global Placement Service", "Grid Positioning System"]],
  ["API", "Application Programming Interface", ["Applied Program Integration", "Automated Process Input", "Application Protocol Interchange"]],
  ["CEO", "Chief Executive Officer", ["Chief Economic Officer", "Central Executive Office", "Chief Engineering Operator"]],
  ["KPI", "Key Performance Indicator", ["Key Process Index", "Known Performance Item", "Key Product Indicator"]],
  ["ROI", "Return on Investment", ["Rate of Income", "Return on Inventory", "Ratio of Impact"]],
  ["SOP", "Standard Operating Procedure", ["Standard Office Policy", "System Operation Plan", "Simple Operating Process"]],
  ["VPN", "Virtual Private Network", ["Visual Public Node", "Verified Protected Network", "Virtual Personal Node"]],
  ["SEO", "Search Engine Optimization", ["Site Engine Operation", "Search Entry Order", "Social Engine Output"]],
  ["UI", "User Interface", ["Unified Input", "Universal Interaction", "User Integration"]],
  ["FAQ", "Frequently Asked Questions", ["Fast Answer Queue", "Frequent Access Query", "Final Answer Quotation"]],
  ["ATM", "Automated Teller Machine", ["Automatic Transfer Money", "Advanced Transaction Module", "Authorized Teller Merchant"]],
  ["LAN", "Local Area Network", ["Long Area Network", "Linked Access Node", "Large Area Node"]],
  ["PIN", "Personal Identification Number", ["Private Index Number", "Personal Input Node", "Protected Identity Number"]],
  ["QR", "Quick Response", ["Quality Reading", "Quantum Router", "Query Result"]],
];

export function buildSingkatanQuestions(count = 10): ContentQuestion[] {
  return shuffle(SINGKATAN)
    .slice(0, count)
    .map(([abbr, answer, wrong]) => {
      const options = shuffle([answer, ...wrong]);
      return quizQuestion2("singkatan", `Kepanjangan dari ${abbr}?`, "Istilah kantor & IT", options, options.indexOf(answer));
    });
}

/** [pernyataan, benar?] */
const FAKTA: ReadonlyArray<readonly [string, boolean]> = [
  ["Madu tidak pernah basi jika disimpan dengan baik.", true],
  ["Lidah jerapah berwarna kehitaman.", true],
  ["Cahaya matahari butuh sekitar 8 menit untuk sampai ke Bumi.", true],
  ["Secara botani, pisang termasuk buah beri (berry).", true],
  ["Gurita punya tiga jantung.", true],
  ["Air mendidih pada suhu lebih rendah di pegunungan tinggi.", true],
  ["Venus adalah planet terpanas di tata surya.", true],
  ["Lumba-lumba adalah mamalia.", true],
  ["Secara botani, tomat adalah buah.", true],
  ["Indonesia memiliki lebih dari 17.000 pulau.", true],
  ["Kelelawar adalah jenis burung.", false],
  ["Manusia hanya memakai 10% otaknya.", false],
  ["Petir tidak pernah menyambar tempat yang sama dua kali.", false],
  ["Tembok Besar Tiongkok terlihat jelas dari Bulan dengan mata telanjang.", false],
  ["Unta menyimpan air di dalam punuknya.", false],
  ["Matahari mengelilingi Bumi.", false],
  ["Sidik jari anak kembar identik sama persis.", false],
  ["Ikan mas hanya mengingat sesuatu selama 3 detik.", false],
  ["Bulan memancarkan cahayanya sendiri.", false],
  ["Internet dan World Wide Web adalah hal yang persis sama.", false],
  ["Ibu kota Australia adalah Sydney.", false],
  ["Python adalah bahasa pemrograman buatan Google.", false],
];

export function buildFaktaQuestions(count = 10): ContentQuestion[] {
  return shuffle(FAKTA)
    .slice(0, count)
    .map(([text, isTrue]) => quizQuestion2("fakta", text, "Benar atau salah?", ["Benar", "Salah"], isTrue ? 0 : 1));
}

// ─── Adu Ketuk ───────────────────────────────────────

export const KETUK_SECONDS = 10;

// ─── Grand Prix Ketik ────────────────────────────────

export const GP_SECONDS = 150;
/** Jumlah kalimat per balapan (± 70 huruf per kalimat). */
export const GP_SENTENCE_COUNT = 5;
export const GP_POINTS_PER_CHAR = 5;

const GP_SENTENCES = [
  "Kerja keras hari ini adalah investasi untuk hasil yang lebih baik besok.",
  "Tiket yang jelas dan rapi membuat seluruh tim bekerja lebih cepat.",
  "Jangan tunda pekerjaan hari ini karena besok sudah ada tugas yang baru.",
  "Komunikasi yang baik adalah kunci utama keberhasilan sebuah proyek.",
  "Setiap bug yang ditemukan lebih awal akan menghemat banyak waktu nanti.",
  "Kopi pagi dan daftar tugas yang jelas adalah awal hari yang sempurna.",
  "Rapat singkat yang fokus jauh lebih berguna daripada rapat panjang.",
  "Simpan pekerjaanmu secara berkala supaya tidak ada yang hilang tiba-tiba.",
  "Tim yang solid selalu saling membantu ketika tenggat waktu semakin dekat.",
  "Belajar hal baru setiap hari membuat kita semakin siap menghadapi tantangan.",
  "Kode yang bersih mudah dibaca, mudah diperbaiki, dan mudah dikembangkan.",
  "Prioritaskan tiket yang paling mendesak, lalu kerjakan satu per satu.",
  "Keyboard yang cepat dan jari yang lincah membuat pekerjaan terasa ringan.",
  "Laporan harian membantu kita melihat perkembangan pekerjaan dengan jelas.",
  "Ide terbaik sering muncul ketika kita berdiskusi santai bersama rekan kerja.",
  "Hujan deras di luar jendela tidak menghalangi tim untuk menyelesaikan target.",
];

/** Teks balapan: beberapa kalimat acak, sama untuk semua pemain (dikirim host). */
export function buildGpText(): string {
  return shuffle(GP_SENTENCES).slice(0, GP_SENTENCE_COUNT).join(" ");
}

/** Panjang awalan yang benar-benar cocok antara ketikan dan teks. */
export function gpCorrectPrefix(typed: string, text: string): number {
  let i = 0;
  while (i < typed.length && i < text.length && typed[i] === text[i]) i++;
  return i;
}

/** 5 poin per huruf benar; sampai finish +300 plus 10 per detik tersisa. */
export const gpScore = (correctChars: number, finished: boolean, secsLeft: number) =>
  correctChars * GP_POINTS_PER_CHAR + (finished ? 300 + Math.max(0, Math.floor(secsLeft)) * 10 : 0);

// ─── Angka Unik, Ikuti Mayoritas, Tarik Tambang ──────

export const PILIH_ROUNDS_UNIK = 6;
export const PILIH_ROUNDS_MAYORITAS = 8;
export const TARIK_SECONDS = 20;

const MAYORITAS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["Liburan ideal?", ["Gunung", "Pantai"]],
  ["Jam kerja favorit?", ["Pagi", "Siang", "Malam"]],
  ["Makan siang paling enak?", ["Nasi padang", "Bakso", "Ayam geprek", "Mie ayam"]],
  ["Minuman sehari-hari?", ["Kopi", "Teh", "Air putih"]],
  ["Hewan peliharaan terbaik?", ["Kucing", "Anjing", "Ikan", "Burung"]],
  ["Paling nyaman bekerja dari mana?", ["Kantor", "Rumah", "Kafe"]],
  ["Sistem operasi favorit?", ["Windows", "macOS", "Linux"]],
  ["Genre film favorit?", ["Aksi", "Komedi", "Horor", "Romantis"]],
  ["Ponsel pilihan?", ["Android", "iPhone"]],
  ["Camilan paling pas buat nonton?", ["Popcorn", "Keripik", "Cokelat"]],
  ["Pilih mana?", ["Gaji naik", "Libur panjang"]],
  ["Rapat paling baik dilakukan…", ["Tatap muka", "Online", "Tidak usah rapat"]],
  ["Hujan paling cocok untuk…", ["Tidur", "Ngopi", "Hujan-hujanan", "Lembur"]],
  ["Kalau punya kekuatan super?", ["Terbang", "Menghilang", "Baca pikiran", "Hentikan waktu"]],
];

/** Soal untuk mode pilih-bareng; `answer` tidak dipakai (-1), skor ditentukan dari pilihan semua pemain. */
export function buildPilihQuestions(mode: "unik" | "mayoritas"): ContentQuestion[] {
  if (mode === "unik") {
    return Array.from({ length: PILIH_ROUNDS_UNIK }, () => ({
      kind: "unik" as const,
      prompt: "Pilih satu angka. Angka TERKECIL yang dipilih sendirian menang!",
      hint: "Kalau ada yang memilih angka yang sama, angka itu gugur",
      options: Array.from({ length: 8 }, (_, i) => String(i + 1)),
      answer: -1,
    }));
  }
  return shuffle(MAYORITAS)
    .slice(0, PILIH_ROUNDS_MAYORITAS)
    .map(([prompt, options]) => ({
      kind: "mayoritas" as const,
      prompt,
      hint: "Pilih yang paling banyak dipilih pemain lain",
      options: [...options],
      answer: -1,
    }));
}

// ─── Rebut Angka, Tepat Waktu, Bom Estafet ───────────

export const REBUT_COUNT = 30;
export const REBUT_SECONDS = 40;

/** Susunan angka 1..30 di papan bersama; sama untuk semua pemain. */
export function buildRebutGrid(): number[] {
  return shuffle(Array.from({ length: REBUT_COUNT }, (_, i) => i + 1));
}

export const TEPAT_ROUNDS = 5;
/** Setelah target lewat sekian ms tanpa menekan STOP, ronde dianggap gagal. */
export const TEPAT_GRACE_MS = 2500;
/** Penghitung waktu hanya terlihat sampai sekian ms, setelah itu pemain harus menghitung sendiri. */
export const TEPAT_VISIBLE_MS = 1000;

/** Target detik tiap ronde (3-8 detik, tidak berulang). */
export function buildTepatTargets(): number[] {
  return shuffle([3, 4, 5, 6, 7, 8]).slice(0, TEPAT_ROUNDS);
}

/** 1000 kalau pas; berkurang linear sampai 0 di selisih 2 detik. */
export const tepatPoints = (errorMs: number) => Math.max(0, Math.round(1000 * (1 - Math.abs(errorMs) / 2000)));

export const BOM_MIN_MS = 8000;
export const BOM_MAX_MS = 18000;
export const BOM_SURVIVE_POINTS = 100;
export const BOM_WINNER_BONUS = 200;

// ─── Dadu Berani, Penyusup, Hitung Emoji ─────────────

export const DADU_ROUNDS = 5;
export const DADU_ROUND_SECONDS = 15;
export const DADU_ROLLS_PER_ROUND = 25;

/** Urutan lemparan dadu tiap ronde; sama untuk semua pemain, jadi murni adu nyali. */
export function buildDaduRolls(): number[][] {
  return Array.from({ length: DADU_ROUNDS }, () => Array.from({ length: DADU_ROLLS_PER_ROUND }, () => rand(1, 6)));
}

/** [kelompok, penyusup] — tiga anggota sekelompok lalu satu penyusup. */
const PENYUSUP: ReadonlyArray<readonly [readonly [string, string, string], string]> = [
  [["Apel", "Jeruk", "Mangga"], "Wortel"],
  [["Kucing", "Sapi", "Kambing"], "Hiu"],
  [["Mobil", "Kereta", "Pesawat"], "Kursi"],
  [["Pensil", "Spidol", "Penghapus"], "Garpu"],
  [["Mars", "Venus", "Saturnus"], "Bulan"],
  [["Python", "Java", "Rust"], "Photoshop"],
  [["Merah", "Biru", "Hijau"], "Segitiga"],
  [["Wajan", "Panci", "Spatula"], "Palu"],
  [["Tangan", "Kaki", "Kepala"], "Meja"],
  [["Kopi", "Teh", "Susu"], "Roti"],
  [["Medan", "Bandung", "Makassar"], "Bangkok"],
  [["Windows", "Linux", "Android"], "Chrome"],
  [["Chrome", "Firefox", "Safari"], "Windows"],
  [["Senin", "Rabu", "Jumat"], "Januari"],
  [["Maret", "Juni", "Agustus"], "Selasa"],
  [["Gitar", "Piano", "Drum"], "Palu"],
  [["Futsal", "Renang", "Badminton"], "Menjahit"],
  [["Paus", "Kelelawar", "Lumba-lumba"], "Penguin"],
  [["Besi", "Emas", "Perak"], "Oksigen"],
  [["Mouse", "Keyboard", "Monitor"], "Excel"],
];

export function buildPenyusupQuestions(count = 10): ContentQuestion[] {
  return shuffle(PENYUSUP)
    .slice(0, count)
    .map(([group, intruder]) => {
      const options = shuffle([...group, intruder]);
      return {
        kind: "penyusup" as const,
        prompt: "Mana yang TIDAK sekelompok dengan yang lain?",
        hint: "Cari penyusupnya",
        options,
        answer: options.indexOf(intruder),
      };
    });
}

export const CACAH_SECONDS = 60;
export const CACAH_QUESTIONS = 10;
const CACAH_EMOJI = ["🍎", "🍌", "🍇", "🍊", "🍓", "🥝", "🍉", "🍒"];

/** [isi papan, emoji yang dihitung, pilihan angka, indeks jawaban benar]. */
export type CacahQuestion = readonly [string[], string, number[], number];

export function buildCacahQuestions(): CacahQuestion[] {
  return Array.from({ length: CACAH_QUESTIONS }, (_, q) => {
    const [target, other1, other2] = shuffle(CACAH_EMOJI).slice(0, 3);
    const total = 12 + Math.min(q, 6) * 2;
    const answer = rand(3, Math.min(9, total - 4));
    const cells = [
      ...Array<string>(answer).fill(target),
      ...Array.from({ length: total - answer }, () => (Math.random() < 0.5 ? other1 : other2)),
    ];
    const wrong = new Set<number>();
    while (wrong.size < 3) {
      const v = answer + rand(1, 3) * (Math.random() < 0.5 ? -1 : 1);
      if (v > 0 && v !== answer) wrong.add(v);
    }
    const options = shuffle([answer, ...wrong]);
    return [shuffle(cells), target, options, options.indexOf(answer)] as const;
  });
}

// ─── Hindari Rintangan (bareng) ──────────────────────

export const HINDAR_TICK_MS = 40;
export const HINDAR_MAX_TICKS = 1800;

/** [tick muncul, jalur, 1 = koin, jalur rintangan kedua atau -1]. */
export type HindarSpawn = readonly [number, number, number, number];

export function buildHindarSchedule(): HindarSpawn[] {
  const out: HindarSpawn[] = [];
  let t = 20;
  while (t < HINDAR_MAX_TICKS) {
    const lane = rand(0, 2);
    const coin = Math.random() < 0.3;
    let second = -1;
    if (!coin && t > 400 && Math.random() < 0.35) second = (lane + rand(1, 2)) % 3;
    out.push([t, lane, coin ? 1 : 0, second] as const);
    t += Math.max(14, 30 - Math.floor(t / 150));
  }
  return out;
}

// ─── Tebak Gelas (bareng) ────────────────────────────

export const GELAS_ROUNDS = 6;

/** [gelas berisi bola, ...pasangan tukar dikodekan a * 3 + b]. */
export type GelasRound = readonly number[];

export function buildGelasRounds(): GelasRound[] {
  return Array.from({ length: GELAS_ROUNDS }, (_, r) => {
    const swaps = Array.from({ length: 4 + (r + 1) * 2 }, () => {
      const a = rand(0, 2);
      const b = (a + rand(1, 2)) % 3;
      return a * 3 + b;
    });
    return [rand(0, 2), ...swaps];
  });
}

// ─── Sentuh Angka (bareng) ───────────────────────────

export const SENTUH_SECONDS = 60;
export const SENTUH_COUNT = 25;

/** Susunan angka 1..25 yang sama untuk semua pemain. */
export function buildSentuhGrid(): number[] {
  return shuffle(Array.from({ length: SENTUH_COUNT }, (_, i) => i + 1));
}

// ─── Cari Harta (bareng) ─────────────────────────────

export const HARTA_SECONDS = 45;
export const HARTA_SIZE = 6;
/** 0 kosong, 1 permata (+40), 2 bom (-40), 3 emas (+100). */
export const HARTA_POINTS = [0, 40, -40, 100] as const;

export function buildHartaGrid(): number[] {
  const cells = Array<number>(HARTA_SIZE * HARTA_SIZE).fill(0);
  const place = (kind: number, n: number) => {
    let left = n;
    while (left > 0) {
      const i = rand(0, cells.length - 1);
      if (cells[i] === 0) {
        cells[i] = kind;
        left -= 1;
      }
    }
  };
  place(3, 2);
  place(1, 7);
  place(2, 5);
  return cells;
}

/** Jumlah permata/emas di 8 sel sekitar. */
export function hartaNear(grid: readonly number[], i: number): number {
  const r = Math.floor(i / HARTA_SIZE);
  const c = i % HARTA_SIZE;
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= HARTA_SIZE || cc >= HARTA_SIZE) continue;
      const v = grid[rr * HARTA_SIZE + cc];
      if (v === 1 || v === 3) n += 1;
    }
  }
  return n;
}

// ─── Aturan Berubah (bareng) ─────────────────────────

export const ATURAN_SECONDS = 40;
export const ATURAN_PER_RULE = 6;
/** Tiap aturan: [label kiri, label kanan, apakah angka masuk kiri]. */
export const ATURAN_RULES = [
  { title: "GANJIL atau GENAP?", left: "Ganjil", right: "Genap", test: (n: number) => n % 2 === 1 },
  { title: "KECIL (<50) atau BESAR (≥50)?", left: "Kecil", right: "Besar", test: (n: number) => n < 50 },
  { title: "KELIPATAN 3 atau BUKAN?", left: "Kelipatan 3", right: "Bukan", test: (n: number) => n % 3 === 0 },
] as const;

/** [angka, indeks aturan] — aturan berganti tiap ATURAN_PER_RULE angka. */
export type AturanItem = readonly [number, number];

export function buildAturanSequence(): AturanItem[] {
  const out: AturanItem[] = [];
  let prev = -1;
  for (let g = 0; g < 20; g++) {
    let rule = rand(0, ATURAN_RULES.length - 1);
    if (rule === prev) rule = (rule + 1) % ATURAN_RULES.length;
    prev = rule;
    for (let k = 0; k < ATURAN_PER_RULE; k++) out.push([rand(1, 99), rule] as const);
  }
  return out;
}
