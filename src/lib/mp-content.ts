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
  kind: "trivia" | "emoji" | "math" | "scramble" | "antonim" | "peribahasa" | "ibukota" | "pola" | "singkatan" | "fakta";
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

// ─── Sentuh Angka ────────────────────────────────────

export const NUMBER_COUNT = 16;
export const NUMBER_SECONDS = 45;

/** Susunan angka 1..16 di papan; sama untuk semua pemain di mode bareng. */
export function buildNumberGrid(): number[] {
  return shuffle(Array.from({ length: NUMBER_COUNT }, (_, i) => i + 1));
}

/** 20 poin per angka benar; selesai semua = bonus sisa waktu (maks +400). */
export function numberScore(tapped: number, elapsedMs: number): number {
  const bonus =
    tapped >= NUMBER_COUNT ? Math.round(Math.max(0, 1 - elapsedMs / (NUMBER_SECONDS * 1000)) * 400) : 0;
  return tapped * 20 + bonus;
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
