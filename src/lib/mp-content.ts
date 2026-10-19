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
  kind: "trivia" | "emoji" | "math" | "scramble";
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
