// =====================================================
// Multiplayer minigame — tipe pesan, pembuat soal, dan skor
//
// Tanpa tabel database: ruangan = channel Supabase Realtime
// (Presence untuk daftar pemain, Broadcast untuk pesan permainan).
// Host (pemain yang masuk paling awal) membuat soal & mengatur giliran;
// semua klien menghitung skor dari data yang sama supaya hasilnya seragam.
// =====================================================

import type { AngkaRound, ArahItem, BanyakItem, JumlahItem } from "@/lib/mp-content";
import {
  CATEGORY_LABEL,
  deadlinePool,
  shuffle,
  type GameTicket,
} from "@/lib/minigame";

export type MpMode =
  | "quiz"
  | "rebutan"
  | "survival"
  | "race"
  | "whack"
  | "hitung"
  | "trivia"
  | "memory"
  | "reflex"
  | "lari"
  | "kata"
  | "simon"
  | "warna"
  | "angka"
  | "beda"
  | "besar"
  | "gambar"
  | "sandi"
  | "labirin"
  | "dua4"
  | "slither"
  | "ketik"
  | "buah"
  | "tebak"
  | "lampu"
  | "geser"
  | "petunjuk"
  | "antonim"
  | "peribahasa"
  | "ibukota"
  | "bidik"
  | "pola"
  | "singkatan"
  | "fakta"
  | "ketuk"
  | "gp"
  | "unik"
  | "mayoritas"
  | "tarik"
  | "rebut"
  | "tepat"
  | "bom"
  | "dadu"
  | "penyusup"
  | "cacah"
  | "jumlah"
  | "ingat"
  | "banyak"
  | "arah";

/** tiket = memakai data tiket tim; umum = bisa dimainkan tanpa data apa pun. */
export type MpModeGroup = "tiket" | "umum";

export interface MpModeConfig {
  group: MpModeGroup;
  label: string;
  emoji: string;
  tagline: string;
  rules: string[];
  minPlayers: number;
}

export const MP_MODES: Record<MpMode, MpModeConfig> = {
  tebak: {
    group: "umum",
    label: "Tebak Angka",
    emoji: "🔮",
    tagline: "Tebak angka rahasia 1-100. Angkanya sama untuk semua, siapa paling hemat tebakan?",
    rules: [
      "3 angka rahasia (1-100, sama untuk semua pemain), maks 7 tebakan per angka, 120 detik total.",
      "Petunjuk: terlalu besar atau terlalu kecil.",
      "Benar = 100 + 50 per sisa tebakan. Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  lampu: {
    group: "umum",
    label: "Lampu Padam",
    emoji: "💡",
    tagline: "Matikan semua lampu secepat mungkin. Papan sama untuk semua pemain!",
    rules: [
      "3 papan 4x4 (sama untuk semua), total 120 detik.",
      "Tap lampu = balik lampu itu plus atas, bawah, kiri, kanan.",
      "Papan padam = 150 + bonus sedikit langkah. Semua selesai = bonus sisa waktu.",
    ],
    minPlayers: 2,
  },
  geser: {
    group: "umum",
    label: "Puzzle Geser",
    emoji: "🧩",
    tagline: "Susun angka 1-8 lebih cepat dari rekan setim. Papan acak sama untuk semua!",
    rules: [
      "Papan 3x3 yang sama untuk semua pemain, 120 detik.",
      "Tap kotak di sebelah ruang kosong untuk menggesernya.",
      "Selesai = 400 + bonus waktu + bonus sedikit langkah. Belum selesai = 20 poin per kotak pas.",
    ],
    minPlayers: 2,
  },
  petunjuk: {
    group: "umum",
    label: "Tebak Petunjuk",
    emoji: "🕵️",
    tagline: "Tebak satu objek dari 3 petunjuk satu kata. Makin cepat tebak, makin besar poinnya!",
    rules: [
      "8 objek sama untuk semua pemain, tiap ronde 24 detik.",
      "Petunjuk muncul bertahap tiap 8 detik: dari yang samar sampai yang jelas.",
      "Tebak dengan mengetik. Benar di petunjuk 1 = 300, petunjuk 2 = 200, petunjuk 3 = 120. Tiap salah -10.",
    ],
    minPlayers: 2,
  },
  antonim: {
    group: "umum",
    label: "Lawan Kata",
    emoji: "↔️",
    tagline: "Pilih lawan kata yang tepat. Siapa kosa katanya paling lincah?",
    rules: [
      "10 kata, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih lawan kata dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  peribahasa: {
    group: "umum",
    label: "Lengkapi Peribahasa",
    emoji: "📜",
    tagline: "Lanjutkan peribahasa yang terpotong. Seberapa hafal pepatah nenek moyang?",
    rules: [
      "10 peribahasa, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih kelanjutan yang tepat dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  ibukota: {
    group: "umum",
    label: "Ibu Kota Dunia",
    emoji: "🌍",
    tagline: "Tebak ibu kota negara-negara dunia. Jangan kalah dari peta!",
    rules: [
      "10 negara, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih ibu kotanya dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  bidik: {
    group: "umum",
    label: "Bidik Cepat",
    emoji: "🎯",
    tagline: "Tap target yang bermunculan sebelum hilang. Awas bom!",
    rules: [
      "30 detik, target muncul di tempat dan waktu yang sama untuk semua pemain.",
      "Target biasa +10 sampai +20 (makin cepat makin besar), emas ⭐ +30 sampai +50, bom 💣 -20.",
      "Makin lama target makin cepat menghilang.",
    ],
    minPlayers: 2,
  },
  pola: {
    group: "umum",
    label: "Pola Angka",
    emoji: "🔢",
    tagline: "Lanjutkan deret angka yang punya pola tersembunyi. Otak logika diuji!",
    rules: [
      "10 deret angka dari mudah ke sulit, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih angka berikutnya dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  singkatan: {
    group: "umum",
    label: "Kepanjangan Singkatan",
    emoji: "🔠",
    tagline: "CPU, KPI, SOP, API… masih ingat kepanjangannya? Istilah kantor & IT!",
    rules: [
      "10 singkatan, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih kepanjangan yang benar dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  fakta: {
    group: "umum",
    label: "Fakta atau Mitos",
    emoji: "🧐",
    tagline: "Pernyataan ini benar atau cuma mitos? Jangan sampai tertipu!",
    rules: [
      "10 pernyataan, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih Benar atau Salah. Cuma 2 pilihan, tapi banyak jebakan!",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  ketuk: {
    group: "umum",
    label: "Adu Ketuk",
    emoji: "👆",
    tagline: "10 detik, ketuk tombol sebanyak mungkin. Jari siapa paling cepat?",
    rules: [
      "Hitung mundur 3 detik, lalu ketuk tombol besar secepat mungkin selama 10 detik.",
      "Tiap ketukan +1 poin (keyboard: Spasi atau Enter juga bisa).",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  gp: {
    group: "umum",
    label: "Grand Prix Ketik",
    emoji: "🏁",
    tagline: "Balapan mobil dengan keyboard! Ketik dengan benar untuk memajukan mobilmu sampai finish.",
    rules: [
      "Semua pemain mengetik teks panjang yang sama (5 kalimat), maksimal 150 detik. Mobilmu maju tiap huruf yang benar.",
      "Salah ketik? Mobil berhenti sampai kamu memperbaikinya (hapus lalu ketik ulang). Tempel teks dimatikan.",
      "5 poin per huruf benar. Sampai finish +300 plus 10 per detik tersisa, jadi yang tercepat menang.",
    ],
    minPlayers: 2,
  },
  unik: {
    group: "umum",
    label: "Angka Unik",
    emoji: "🎲",
    tagline: "Pilih angka 1-8 bersamaan. Angka terkecil yang dipilih SENDIRIAN yang menang. Main tebak-tebakan pikiran!",
    rules: [
      "6 ronde, tiap ronde 12 detik. Semua pemain memilih satu angka (1-8) secara rahasia.",
      "Pemenang ronde = pemilik angka TERKECIL yang tidak dipilih orang lain: +300 poin.",
      "Kalau angkamu sama dengan orang lain, angka itu gugur. Tidak ada angka unik = tidak ada yang menang.",
    ],
    minPlayers: 3,
  },
  mayoritas: {
    group: "umum",
    label: "Ikuti Mayoritas",
    emoji: "🗳️",
    tagline: "Tebak apa yang akan dipilih kebanyakan rekan setimu. Siapa yang paling kompak?",
    rules: [
      "8 pertanyaan selera (kopi atau teh? gunung atau pantai?), tiap ronde 12 detik.",
      "Pilih jawaban secara rahasia. Yang memilih opsi terbanyak (minimal 2 orang) dapat +100.",
      "Setelah semua menjawab, pilihan semua orang dibuka. Tebak selera tim, bukan seleramu!",
    ],
    minPlayers: 3,
  },
  tarik: {
    group: "umum",
    label: "Tarik Tambang",
    emoji: "🪢",
    tagline: "Dua tim beradu ketuk! Semakin cepat timmu mengetuk, semakin tali tertarik ke sisimu.",
    rules: [
      "Pemain dibagi dua tim (Merah & Biru) bergantian sesuai urutan masuk.",
      "20 detik, ketuk tombol sebanyak mungkin (keyboard: Spasi atau Enter juga bisa).",
      "Tim dengan rata-rata ketukan per pemain lebih tinggi menang. Skor pribadi = jumlah ketukan.",
    ],
    minPlayers: 2,
  },
  rebut: {
    group: "umum",
    label: "Rebut Angka",
    emoji: "🏃",
    tagline: "Satu papan angka untuk semua. Siapa paling cepat menyentuh angka berikutnya, dia yang dapat poin!",
    rules: [
      "Papan 1-30 yang sama untuk semua pemain, 40 detik. Semua mencari angka yang SAMA secara berurutan: 1, 2, 3, …",
      "Tap angka berikutnya secepat mungkin. Yang tercepat mengklaim angka itu (+10), yang lambat gigit jari.",
      "Angka yang sudah direbut ditandai avatar perebutnya. Host menjadi wasit kalau ada yang tap bersamaan.",
    ],
    minPlayers: 2,
  },
  tepat: {
    group: "umum",
    label: "Tepat Waktu",
    emoji: "⏱️",
    tagline: "Tekan STOP tepat di detik yang diminta. Penghitung waktu menghilang, andalkan insting!",
    rules: [
      "5 ronde, target waktu berbeda-beda (3-8 detik) dan sama untuk semua pemain.",
      "Penghitung waktu hanya terlihat 1 detik pertama, lalu menghilang. Tekan STOP saat kamu rasa target tercapai.",
      "Poin ronde = 1000 kalau pas, berkurang makin jauh selisihnya (0 di selisih 2 detik).",
    ],
    minPlayers: 2,
  },
  bom: {
    group: "umum",
    label: "Bom Estafet",
    emoji: "💣",
    tagline: "Lempar bom ke temanmu sebelum meledak! Pemegang bom saat meledak gugur. Penyintas terakhir menang.",
    rules: [
      "Satu bom beredar. Pemegang bom harus melemparnya ke pemain lain yang masih hidup.",
      "Bom meledak di waktu acak (8-18 detik) tanpa tanda. Yang memegangnya saat meledak gugur.",
      "Tiap ronde yang selamat +100. Penyintas terakhir +200 bonus. Butuh minimal 3 pemain.",
    ],
    minPlayers: 3,
  },
  dadu: {
    group: "umum",
    label: "Dadu Berani",
    emoji: "🎲",
    tagline: "Lempar dadu terus untuk menumpuk poin, tapi angka 1 menghanguskan semuanya. Berani sampai mana?",
    rules: [
      "5 ronde, tiap ronde maksimal 15 detik. Urutan dadu sama untuk semua pemain.",
      "Tekan LEMPAR untuk menambah poin giliran. Kalau keluar angka 1, poin giliran hangus dan ronde berakhir.",
      "Tekan SIMPAN kapan saja untuk mengamankan poin giliran ke skor totalmu. Waktu habis = otomatis disimpan.",
    ],
    minPlayers: 2,
  },
  penyusup: {
    group: "umum",
    label: "Penyusup",
    emoji: "🕵️",
    tagline: "Empat kata, tiga sekelompok dan satu penyusup. Siapa paling cepat menemukannya?",
    rules: [
      "10 soal, 15 detik per soal. Soal sama untuk semua pemain.",
      "Pilih kata yang TIDAK sekelompok dengan tiga lainnya.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  cacah: {
    group: "umum",
    label: "Hitung Emoji",
    emoji: "🍓",
    tagline: "Hitung berapa banyak satu emoji di antara tumpukan emoji lain. Mata jeli, hitungan cepat!",
    rules: [
      "10 papan emoji (makin lama makin banyak), 60 detik total. Papan sama untuk semua pemain.",
      "Hitung jumlah emoji yang diminta lalu pilih angkanya dari 4 pilihan.",
      "Benar +100, salah -20. Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  ketik: {
    group: "umum",
    label: "Ketik Kata",
    emoji: "⌨️",
    tagline: "Adu cepat mengetik kata yang sama. Siapa jarinya paling lincah?",
    rules: [
      "45 detik, urutan kata sama untuk semua pemain.",
      "Otomatis lanjut begitu kata benar. 10 poin per huruf, +20 kalau tanpa salah.",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  buah: {
    group: "umum",
    label: "Tangkap Buah",
    emoji: "🧺",
    tagline: "Geser keranjang menangkap buah. Jadwal jatuh sama untuk semua pemain!",
    rules: [
      "40 detik, geser keranjang dengan mouse/jari atau panah / A D.",
      "Buah +10, bintang emas ⭐ +30, bom 💣 -20.",
      "Barang yang jatuh persis sama untuk semua pemain, jadi murni adu skill.",
    ],
    minPlayers: 2,
  },
  slither: {
    group: "umum",
    label: "Slither Arena",
    emoji: "🐍",
    tagline: "Arena ular besar ala slither.io dengan ular bot. Makan, tumbuh, dan jebak lawan!",
    rules: [
      "Arahkan ular dengan mouse/jari. Tahan Spasi atau tombol ⚡ untuk ngebut (ekor memendek).",
      "Makan pelet = ular makin panjang & gemuk (+10 poin per pelet). Ada 5 ular bot 🤖 yang ikut berkeliaran.",
      "Kepalamu menabrak badan ular lain = kamu mati (bisa respawn). Ular (pemain atau bot) yang menabrak badanmu = +100 untukmu.",
      "Panah di tepi layar & minimap menunjukkan lokasi teman. Waktu 120 detik, skor tertinggi menang.",
    ],
    minPlayers: 1,
  },
  sandi: {
    group: "umum",
    label: "Sandi Rahasia",
    emoji: "🔐",
    tagline: "Pecahkan sandi 4 warna dari petunjuk. Siapa paling jeli dan hemat percobaan?",
    rules: [
      "3 sandi (4 warna, boleh berulang), 180 detik total, maks 10 tebakan per sandi.",
      "● = warna & posisi pas, ○ = warna ada tapi posisi salah.",
      "Sandi sama untuk semua pemain. Makin sedikit tebakan & makin cepat, makin besar poin.",
    ],
    minPlayers: 2,
  },
  labirin: {
    group: "umum",
    label: "Labirin Kilat",
    emoji: "🧭",
    tagline: "Cari jalan keluar dari labirin gelap. Kamu hanya melihat sekitar dirimu!",
    rules: [
      "Labirin 15x15 yang sama untuk semua, 90 detik. Gerak dengan panah / WASD / tombol arah.",
      "Kabut menutupi labirin — area yang sudah dijelajahi tetap terlihat.",
      "Sampai finish = 400 + bonus waktu. Belum sampai = poin sesuai kedekatan dengan finish.",
    ],
    minPlayers: 2,
  },
  dua4: {
    group: "umum",
    label: "Hitung 24",
    emoji: "🎯",
    tagline: "Susun 4 angka dengan + − × ÷ dan kurung sampai hasilnya tepat 24!",
    rules: [
      "6 soal (4 angka 1-9, dijamin ada jawabannya), 150 detik total.",
      "Pakai tiap angka tepat satu kali. Soal sama untuk semua pemain.",
      "Benar = 150 + bonus kecepatan (maks +100). Boleh lewati soal yang buntu.",
    ],
    minPlayers: 2,
  },
  gambar: {
    group: "umum",
    label: "Tebak Gambar",
    emoji: "🎨",
    tagline: "Satu orang menggambar kata rahasia, yang lain menebak. Gantian jadi tukang gambar!",
    rules: [
      "Jumlah ronde = jumlah pemain x 2, tukang gambar bergiliran tiap ronde.",
      "Tukang gambar memilih 1 dari 3 kata (10 detik, otomatis kata pertama), lalu menggambarnya (dilarang menulis huruf!). Waktu 60 detik.",
      "Penebak mengetik tebakan di kolom jawaban. Benar lebih cepat = poin lebih besar.",
      "Tukang gambar dapat poin dari tiap penebak yang berhasil, bonus kalau semua berhasil.",
    ],
    minPlayers: 2,
  },
  beda: {
    group: "umum",
    label: "Cari Beda",
    emoji: "🔍",
    tagline: "Temukan emoji yang beda sendiri. Papan sama untuk semua pemain!",
    rules: [
      "30 detik, papan makin besar tiap beberapa soal.",
      "Tap emoji yang beda. Benar +10, salah -5.",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  besar: {
    group: "umum",
    label: "Lebih Besar",
    emoji: "⚖️",
    tagline: "Mana yang nilainya lebih besar? Soal sama untuk semua, adu cepat!",
    rules: [
      "30 detik, dari angka biasa sampai hitungan campur.",
      "Tap sisi dengan nilai lebih besar. Benar +10, salah -5.",
      "Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  warna: {
    group: "umum",
    label: "Warna Mengecoh",
    emoji: "🌈",
    tagline: "Tap warna TINTA kata, bukan tulisannya. Awas tertipu!",
    rules: [
      "30 detik, urutan kata & warna sama untuk semua pemain.",
      "Benar +10, salah -5. Skor semua pemain terlihat langsung.",
      "Makin cepat tap, makin banyak soal yang terjawab.",
    ],
    minPlayers: 2,
  },
  angka: {
    group: "umum",
    label: "Cari Angka",
    emoji: "🔢",
    tagline: "Temukan angka yang diminta di antara tumpukan angka. Perintahnya acak dan makin sulit!",
    rules: [
      "60 detik, ronde & papan sama untuk semua pemain. Papan makin besar dan angkanya makin panjang.",
      "Perintah bervariasi: angka tertentu, terbesar, terkecil, kelipatan, sampai jumlah digit. Angka mirip jadi pengecoh!",
      "Benar +10 sampai +60 (makin tinggi level & makin cepat makin besar). Salah -5 dan papan diacak ulang.",
    ],
    minPlayers: 2,
  },
  jumlah: {
    group: "umum",
    label: "Jumlah Pas",
    emoji: "➕",
    tagline: "Pilih dua angka yang jika dijumlahkan tepat sama dengan target. Soal sama untuk semua!",
    rules: [
      "45 detik, tiap soal ada target dan beberapa angka di papan.",
      "Tap dua angka yang jumlahnya pas target. Benar +15, salah -5.",
      "Makin lama papan makin ramai dan angkanya makin besar.",
    ],
    minPlayers: 2,
  },
  ingat: {
    group: "umum",
    label: "Ingat Angka",
    emoji: "📟",
    tagline: "Hafalkan deretan angka yang berkedip lalu ketik ulang. Makin benar, makin panjang!",
    rules: [
      "75 detik, deret angka sama untuk semua pemain tapi panjangnya mengikuti levelmu.",
      "Angka tampil sebentar lalu hilang. Ketik ulang dengan benar: +10 per digit, lalu deret bertambah satu.",
      "Salah = tanpa poin dan deret berkurang satu (minimal 3).",
    ],
    minPlayers: 2,
  },
  banyak: {
    group: "umum",
    label: "Banyak Mana",
    emoji: "⚖️",
    tagline: "Dua kotak berisi emoji, mana yang isinya lebih banyak? Selisihnya makin tipis!",
    rules: [
      "30 detik, soal sama untuk semua pemain.",
      "Tap kotak yang emojinya lebih banyak (keyboard: F kiri, J kanan, atau ← →).",
      "Benar +10, salah -5. Makin lama selisihnya makin kecil.",
    ],
    minPlayers: 2,
  },
  arah: {
    group: "umum",
    label: "Arah Terbalik",
    emoji: "🧭",
    tagline: "Ikuti panah, tapi kalau diminta BALIK ARAH, tap arah sebaliknya!",
    rules: [
      "30 detik, panah dan aturan sama untuk semua pemain.",
      "Aturan IKUTI = tap arah panah. Aturan BALIK = tap arah berlawanan.",
      "Pakai tombol arah di layar atau keyboard (panah / WASD). Benar +10, salah -5.",
    ],
    minPlayers: 2,
  },
  lari: {
    group: "umum",
    label: "Lomba Lari",
    emoji: "🏃",
    tagline: "Siapa yang paling cepat sampai garis finish? Gantian kiri-kanan secepat kilat!",
    rules: [
      "Tap tombol KIRI dan KANAN bergantian (keyboard: F dan J, atau ← dan →).",
      "Tap sisi yang sama dua kali = tersandung, tidak maju.",
      "Yang sampai finish duluan menang, makin cepat bonus makin besar. Batas 30 detik.",
    ],
    minPlayers: 2,
  },
  kata: {
    group: "umum",
    label: "Acak Kata",
    emoji: "🔤",
    tagline: "Huruf diacak, tebak kata aslinya. Otak IT vs otak kantoran!",
    rules: [
      "10 kata acak (istilah kerja & IT), 15 detik per soal.",
      "Pilih kata aslinya dari 4 pilihan.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  simon: {
    group: "umum",
    label: "Pola Ajaib",
    emoji: "🎨",
    tagline: "Hafalkan urutan warna yang menyala, ulangi tanpa salah. Makin lama makin panjang!",
    rules: [
      "Perhatikan urutan pad yang menyala, lalu ulangi persis.",
      "Tiap level urutan bertambah satu. Pola sama untuk semua pemain.",
      "Salah atau kehabisan waktu = selesai. Skor = level yang lolos x 100.",
    ],
    minPlayers: 2,
  },
  hitung: {
    group: "umum",
    label: "Hitung Kilat",
    emoji: "🧮",
    tagline: "Adu hitung di kepala. Otak siapa yang paling ngebut?",
    rules: [
      "12 soal hitung dari mudah ke susah, 15 detik per soal.",
      "Semua pemain dapat soal yang sama di waktu yang sama.",
      "Benar = 100 + bonus kecepatan (maks +100).",
    ],
    minPlayers: 2,
  },
  trivia: {
    group: "umum",
    label: "Trivia Seru",
    emoji: "🧠",
    tagline: "Pengetahuan umum, teknologi, dan tebak emoji film. Tidak ada hubungannya dengan tiket!",
    rules: [
      "10 soal campur: pengetahuan umum dan tebak emoji.",
      "Benar = 100 + bonus kecepatan (maks +100).",
      "Yang paling cepat dan paling tahu yang menang.",
    ],
    minPlayers: 2,
  },
  memory: {
    group: "umum",
    label: "Memori Kilat",
    emoji: "🃏",
    tagline: "Cocokkan pasangan kartu. Susunan kartu sama untuk semua pemain!",
    rules: [
      "16 kartu (8 pasang), 60 detik.",
      "Pasangan cocok +100, beruntun menambah bonus. Salah -10.",
      "Selesai lebih cepat = bonus sisa waktu.",
    ],
    minPlayers: 2,
  },
  reflex: {
    group: "umum",
    label: "Refleks Kilat",
    emoji: "🚦",
    tagline: "Tunggu layar hijau lalu tap secepat kilat. Awas kepagian!",
    rules: [
      "6 ronde. Tunggu layar berubah hijau, baru tap.",
      "Poin = 1000 dikurangi waktu reaksimu (ms).",
      "Tap sebelum hijau = 0 poin untuk ronde itu.",
    ],
    minPlayers: 2,
  },
  quiz: {
    group: "tiket",
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
    group: "tiket",
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
  survival: {
    group: "tiket",
    label: "Survival",
    emoji: "💀",
    tagline: "Satu salah, langsung gugur. Siapa penyintas terakhir di tim?",
    rules: [
      "Soal sama seperti kuis, 15 detik per soal.",
      "Jawaban salah atau telat = tereliminasi (tetap bisa menonton).",
      "Penyintas dapat poin tiap ronde, lebih cepat lebih besar.",
      "Penyintas terakhir dapat bonus +200. Bisa selesai sebelum soal habis!",
    ],
    minPlayers: 2,
  },
  whack: {
    group: "tiket",
    label: "Gebuk Bareng",
    emoji: "🔨",
    tagline: "Tiket yang sama muncul untuk semua. Siapa paling jago menggebuk?",
    rules: [
      "30 detik, jadwal tiket muncul persis sama untuk semua pemain.",
      "Prioritas tinggi = poin besar, ✨ tiket emas +10, 💣 bom -5.",
      "Tiket kabur memutus kombo. Skor semua pemain terlihat langsung.",
    ],
    minPlayers: 2,
  },
  race: {
    group: "tiket",
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

export const MP_MODE_KEYS: MpMode[] = [
  "quiz",
  "rebutan",
  "survival",
  "whack",
  "race",
  "hitung",
  "trivia",
  "memory",
  "reflex",
  "lari",
  "kata",
  "simon",
  "warna",
  "angka",
  "beda",
  "besar",
  "gambar",
  "sandi",
  "labirin",
  "dua4",
  "slither",
  "ketik",
  "buah",
  "tebak",
  "lampu",
  "geser",
  "petunjuk",
  "antonim",
  "peribahasa",
  "ibukota",
  "bidik",
  "pola",
  "singkatan",
  "fakta",
  "ketuk",
  "gp",
  "unik",
  "mayoritas",
  "tarik",
  "rebut",
  "tepat",
  "bom",
  "dadu",
  "penyusup",
  "cacah",
  "jumlah",
  "ingat",
  "banyak",
  "arah",
];

export const ROUND_MS = 15_000;
export const RACE_SECONDS = 45;
export const MP_ROUNDS = 10;
export const DRAW_SECONDS = 60;

// ─── Soal ────────────────────────────────────────────

export type QuestionKind =
  | "owner"
  | "category"
  | "deadline"
  | "math"
  | "trivia"
  | "emoji"
  | "scramble"
  | "antonim"
  | "peribahasa"
  | "ibukota"
  | "pola"
  | "singkatan"
  | "fakta"
  | "unik"
  | "mayoritas"
  | "penyusup";

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
  math: "🧮 Hitung cepat!",
  trivia: "🧠 Trivia",
  emoji: "🎬 Tebak emoji",
  scramble: "🔤 Susun huruf ini jadi kata",
  antonim: "↔️ Apa lawan katanya?",
  peribahasa: "📜 Lengkapi peribahasa",
  ibukota: "🌍 Geografi dunia",
  pola: "🔢 Angka berikutnya?",
  singkatan: "🔠 Kepanjangan singkatan",
  fakta: "🧐 Fakta atau mitos?",
  unik: "🎲 Pilih angka rahasiamu",
  mayoritas: "🗳️ Tebak selera mayoritas",
  penyusup: "🕵️ Cari penyusupnya",
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
export function scoreRound(q: MpQuestion, answers: RoundAnswers, mode: MpMode): Record<string, number> {
  const correct = Object.entries(answers)
    .filter(([, a]) => a.c === q.answer)
    .sort((a, b) => a[1].ms - b[1].ms || a[0].localeCompare(b[0]));
  const pts: Record<string, number> = {};
  correct.forEach(([id, a], rank) => {
    pts[id] =
      mode === "rebutan" || mode === "survival"
        ? (RANK_POINTS[rank] ?? 40)
        : 100 + Math.round(Math.max(0, 1 - a.ms / ROUND_MS) * 100);
  });
  return pts;
}

// ─── Pilih bareng (Angka Unik & Ikuti Mayoritas) ─────

/**
 * Poin satu ronde dari pilihan semua pemain — dipanggil identik di semua klien.
 * unik: angka terkecil yang dipilih SENDIRIAN menang 300 (c = indeks, angka = c + 1).
 * mayoritas: pemain yang memilih opsi terbanyak (minimal 2 orang) dapat 100.
 */
export function scorePilih(mode: MpMode, answers: RoundAnswers): Record<string, number> {
  const byChoice = new Map<number, string[]>();
  for (const [id, a] of Object.entries(answers)) byChoice.set(a.c, [...(byChoice.get(a.c) ?? []), id]);
  const pts: Record<string, number> = {};
  if (mode === "unik") {
    const lowest = [...byChoice.entries()]
      .filter(([, ids]) => ids.length === 1)
      .sort((a, b) => a[0] - b[0])[0];
    if (lowest) pts[lowest[1][0]] = 300;
    return pts;
  }
  const top = Math.max(0, ...[...byChoice.values()].map((ids) => ids.length));
  if (top >= 2) for (const ids of byChoice.values()) if (ids.length === top) for (const id of ids) pts[id] = 100;
  return pts;
}

// ─── Tebak Gambar ────────────────────────────────────

/**
 * Poin satu ronde. `hits` = penebak yang benar (ms = waktu tebak).
 * Penebak: 100 + bonus kecepatan. Tukang gambar: 50 per penebak, +50 kalau semua berhasil.
 */
export function scoreDraw(drawerId: string, hits: RoundAnswers, guesserIds: string[]): Record<string, number> {
  const pts: Record<string, number> = {};
  let n = 0;
  for (const id of guesserIds) {
    const h = hits[id];
    if (!h) continue;
    n++;
    pts[id] = 100 + Math.round(Math.max(0, 1 - h.ms / (DRAW_SECONDS * 1000)) * 100);
  }
  if (n > 0) pts[drawerId] = n * 50 + (n === guesserIds.length ? 50 : 0);
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

// ─── Gebuk bareng ────────────────────────────────────

export const WHACK_SECONDS = 30;
export const WHACK_HOLES = 9;

export interface WhackSpawn {
  /** Muncul pada ms ke-N sejak mulai. */
  at: number;
  /** Lama tampil (ms). */
  life: number;
  slot: number;
  kind: "ticket" | "bomb" | "gold";
  ticket_id: string;
  subject: string;
  priority: GameTicket["priority"];
}

/** Jadwal kemunculan deterministik: dibuat host, diputar ulang di semua klien. */
export function buildWhackSchedule(tickets: GameTicket[]): WhackSpawn[] {
  const pool = tickets.filter((t) => t.ticket_id);
  const busyUntil = Array<number>(WHACK_HOLES).fill(-1);
  const out: WhackSpawn[] = [];
  let at = 700;
  while (at < WHACK_SECONDS * 1000 - 600) {
    const sec = at / 1000;
    const life = Math.max(850, Math.round(1700 - sec * 25));
    const free = busyUntil.flatMap((end, i) => (end <= at ? [i] : []));
    if (free.length > 0) {
      const slot = free[Math.floor(Math.random() * free.length)];
      const t = pool[Math.floor(Math.random() * pool.length)];
      const r = Math.random();
      const kind: WhackSpawn["kind"] = r < 0.12 ? "bomb" : r < 0.2 ? "gold" : "ticket";
      out.push({ at, life, slot, kind, ticket_id: t.ticket_id, subject: t.subject, priority: t.priority });
      busyUntil[slot] = at + life + 100;
    }
    at += Math.max(220, Math.round(520 - sec * 8)) + Math.floor(Math.random() * 120);
  }
  return out;
}

export function canPlayWhack(tickets: GameTicket[]): boolean {
  return tickets.filter((t) => t.ticket_id).length >= 3;
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
  schedule?: WhackSpawn[];
  /** Susunan kartu Memori Kilat. */
  deck?: string[];
  /** Jeda tunggu tiap ronde Refleks Kilat (ms). */
  delays?: number[];
  /** Pola pad Pola Ajaib (0-3). */
  pattern?: number[];
  /** Urutan [kata, tinta] Warna Mengecoh. */
  stroop?: Array<readonly [number, number]>;
  /** Ronde Cari Angka: perintah, isi papan, jawaban. */
  angka?: AngkaRound[];
  /** Jumlah Pas: [target, angka di papan]. */
  jumlah?: JumlahItem[];
  /** Ingat Angka: deret digit tiap putaran. */
  ingat?: string[];
  /** Banyak Mana: [kiri, kanan, emoji, seed]. */
  banyak?: BanyakItem[];
  /** Arah Terbalik: [arah, balik?]. */
  arah?: ArahItem[];
  /** Soal Cari Beda: [pasangan, sisi biasa, posisi si beda]. */
  beda?: Array<readonly [number, number, number]>;
  /** Soal Lebih Besar: [teks kiri, nilai kiri, teks kanan, nilai kanan]. */
  besar?: Array<readonly [string, number, string, number]>;
  /** Kata rahasia Tebak Gambar, satu per ronde (jumlah pemain x 2). */
  words?: string[][];
  /** Sandi Rahasia: 3 sandi, tiap sandi 4 indeks warna. */
  codes?: number[][];
  /** Labirin Kilat: bitmask sisi terbuka tiap sel. */
  maze?: number[];
  /** Hitung 24: 4 angka per soal. */
  puzzles?: number[][];
  /** Slither Arena: seed untuk pelet awal yang sama di semua klien. */
  seed?: number;
  /** Ketik Kata: urutan kata. */
  typing?: string[];
  /** Tangkap Buah: jadwal [ms, x%, jenis, variasi]. */
  buah?: Array<readonly [number, number, number, number]>;
  /** Tebak Angka: angka rahasia tiap ronde. */
  tebak?: number[];
  /** Lampu Padam: papan awal (0/1) tiap ronde. */
  lampu?: number[][];
  /** Puzzle Geser: susunan awal papan 3x3 (0 = kosong). */
  geser?: number[];
  /** Tebak Petunjuk: indeks objek (PETUNJUK_BANK) tiap ronde. */
  petunjuk?: number[];
  /** Bidik Cepat: jadwal target [ms, x%, y%, lama ms, jenis]. */
  bidik?: Array<readonly [number, number, number, number, number]>;
  /** Grand Prix Ketik: teks balapan. */
  gp?: string;
  /** Rebut Angka: susunan angka 1..30 di papan. */
  rebut?: number[];
  /** Tepat Waktu: target detik tiap ronde. */
  tepat?: number[];
  /** Dadu Berani: urutan lemparan dadu tiap ronde. */
  dadu?: number[][];
  /** Hitung Emoji: [isi papan, emoji target, pilihan angka, indeks benar]. */
  cacah?: Array<readonly [string[], string, number[], number]>;
  /** Pembeda antar permainan supaya komponen game selalu bersih. */
  nonce: number;
}

export type MpMessage =
  | ({ t: "start" } & StartPayload)
  | { t: "lobby" }
  | { t: "mode"; mode: MpMode }
  | { t: "round"; i: number }
  | { t: "ans"; i: number; id: string; c: number; ms: number }
  | { t: "reveal"; i: number; answers: RoundAnswers }
  | { t: "end" }
  | { t: "prog"; id: string; score: number; n: number; done?: boolean }
  /** Tebak Gambar: potongan goresan (koordinat 0-1000, x lalu y berselang-seling). */
  | { t: "stroke"; i: number; c: number; w: number; s: boolean; p: number[] }
  | { t: "clear"; i: number }
  /** Rebut Angka: pemain id mengklaim angka n (host menjadi wasit, balasannya `won`). */
  | { t: "claim"; n: number; id: string }
  | { t: "won"; n: number; id: string }
  /** Bom Estafet: lemparan bom (from kosong = bom dibagikan host di awal ronde) dan ledakan. */
  | { t: "pass"; from: string; to: string }
  | { t: "boom"; i: number; id: string }
  /** Tebak Gambar: tukang gambar memilih kata ke-k dari pilihan ronde i. */
  | { t: "pick"; i: number; k: number }
  | { t: "guess"; i: number; id: string; text: string }
  | { t: "hit"; i: number; id: string; ms: number }
  /** Slither Arena: posisi ular (seg = titik kepala lalu badan, x,y berselang-seling). */
  | {
      t: "snk";
      id: string;
      a: number;
      b: boolean;
      len: number;
      /** Kosong kalau pengirim sedang mati (host tetap mengirim bot). */
      seg: number[];
      /** Hanya dari host: ular bot yang sedang hidup. */
      bots?: Array<{ id: string; a: number; len: number; seg: number[] }>;
    }
  /** Pelet dimakan / ditambah / dijatuhkan ular mati: f = id atau [id,x,y,nilai] berulang. */
  | { t: "eat"; f: number[] }
  | { t: "food"; f: number[] }
  | { t: "dead"; id: string; by: string | null; f: number[] };

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
