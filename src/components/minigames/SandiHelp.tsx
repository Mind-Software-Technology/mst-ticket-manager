// =====================================================
// SandiHelp — legenda petunjuk & panduan singkat Sandi Rahasia
// (dipakai mode solo dan multiplayer)
// =====================================================

export function SandiHelp() {
  return (
    <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-slate-600">
      <p className="font-bold text-slate-700">Cara membaca petunjuk di kanan tiap tebakan:</p>
      <p className="mt-1">
        <span className="font-black text-slate-800">●</span> = warna benar <b>dan</b> posisinya benar
      </p>
      <p>
        <span className="font-black text-slate-400">○</span> = warna benar, tapi posisinya salah
      </p>
      <p className="text-slate-400">Tidak ada bulatan = warna itu tidak ada di sandi.</p>

      <details className="mt-1.5">
        <summary className="cursor-pointer font-bold text-indigo-600">Cara main &amp; tips</summary>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Sandi rahasia = 4 warna berurutan (warna boleh berulang).</li>
          <li>Tekan 4 warna untuk mengisi kotak, lalu tekan <b>Tebak ✔</b>.</li>
          <li>
            Jumlah bulatan = jumlah warna yang benar. Urutan bulatan <b>tidak</b> menunjukkan posisi mana yang benar.
          </li>
          <li>Warna yang tidak menghasilkan bulatan bisa dicoret. Jangan ulangi tebakan yang sama.</li>
          <li>Kalau totalnya sudah 4 bulatan, semua warna sudah ketemu. Tinggal atur urutannya.</li>
          <li>Makin sedikit tebakan dan makin cepat, makin besar poinnya.</li>
        </ol>
      </details>
    </div>
  );
}
