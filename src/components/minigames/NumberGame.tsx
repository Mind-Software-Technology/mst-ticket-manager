"use client";

// =====================================================
// NumberGame — Cari Angka (solo)
//
// Dulu "Sentuh Angka" yang berurutan. Sekarang tiap ronde punya perintah
// berbeda (angka tertentu, terbesar, terkecil, kelipatan, jumlah digit)
// di papan yang makin besar. Logikanya ada di QuickGames / QuickViews.
// =====================================================

import { SoloQuick } from "./QuickGames";

export function NumberGame({ userId }: { userId?: string }) {
  return <SoloQuick game="angka" userId={userId} />;
}
