"use client";

// =====================================================
// QuickGames — pembungkus solo & bareng untuk Cari Angka, Jumlah Pas,
// Ingat Angka, Banyak Mana, dan Arah Terbalik.
// =====================================================

import {
  ANGKA_SECONDS,
  ARAH_SECONDS,
  BANYAK_SECONDS,
  CEK_SECONDS,
  KALI_SECONDS,
  KEMBAR_SECONDS,
  URUT_SECONDS,
  INGAT_SECONDS,
  JUMLAH_SECONDS,
  buildAngkaRounds,
  buildArahSequence,
  buildBanyakSequence,
  buildCekSequence,
  buildKaliSequence,
  buildKembarSequence,
  buildUrutSequence,
  buildIngatPool,
  buildJumlahSequence,
} from "@/lib/mp-content";
import type { MpMessage, MpMode, MpPlayer, StartPayload } from "@/lib/multiplayer";
import { RaceShell, SoloShell } from "./GameShells";
import { AngkaView, ArahView, BanyakView, CekView, IngatView, JumlahView, KaliView, KembarView, UrutView } from "./QuickViews";

export type QuickKey = "angka" | "jumlah" | "ingat" | "banyak" | "arah" | "kali" | "cek" | "kembar" | "urut";

export function SoloQuick({ game, userId }: { game: QuickKey; userId?: string }) {
  switch (game) {
    case "angka":
      return (
        <SoloShell game="angka" userId={userId} seconds={ANGKA_SECONDS} build={() => buildAngkaRounds()}>
          {(data, answer) => <AngkaView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "jumlah":
      return (
        <SoloShell game="jumlah" userId={userId} seconds={JUMLAH_SECONDS} build={() => buildJumlahSequence()}>
          {(data, answer) => <JumlahView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "ingat":
      return (
        <SoloShell game="ingat" userId={userId} seconds={INGAT_SECONDS} build={() => buildIngatPool()}>
          {(data, answer) => <IngatView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "banyak":
      return (
        <SoloShell game="banyak" userId={userId} seconds={BANYAK_SECONDS} build={() => buildBanyakSequence()}>
          {(data, answer) => <BanyakView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "kali":
      return (
        <SoloShell game="kali" userId={userId} seconds={KALI_SECONDS} build={() => buildKaliSequence()}>
          {(data, answer) => <KaliView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "cek":
      return (
        <SoloShell game="cek" userId={userId} seconds={CEK_SECONDS} build={() => buildCekSequence()}>
          {(data, answer) => <CekView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "kembar":
      return (
        <SoloShell game="kembar" userId={userId} seconds={KEMBAR_SECONDS} build={() => buildKembarSequence()}>
          {(data, answer) => <KembarView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "urut":
      return (
        <SoloShell game="urut" userId={userId} seconds={URUT_SECONDS} build={() => buildUrutSequence()}>
          {(data, answer) => <UrutView data={data} onAnswer={answer} />}
        </SoloShell>
      );
    case "arah":
      return (
        <SoloShell game="arah" userId={userId} seconds={ARAH_SECONDS} build={() => buildArahSequence()}>
          {(data, answer) => <ArahView data={data} onAnswer={answer} />}
        </SoloShell>
      );
  }
}

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function RaceQuick({
  room,
  me,
  config,
  onLobby,
  onLeave,
}: {
  room: RoomApi;
  me: MpPlayer;
  config: StartPayload;
  onLobby: () => void;
  onLeave: () => void;
}) {
  const shell = { room, me, config, onLobby, onLeave };
  const mode = config.mode as MpMode;
  switch (mode) {
    case "angka":
      return (
        <RaceShell {...shell} mode="angka" seconds={ANGKA_SECONDS} blurb="Cari angka yang diminta, secepat kilat!">
          {(answer) => <AngkaView data={config.angka ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "jumlah":
      return (
        <RaceShell {...shell} mode="jumlah" seconds={JUMLAH_SECONDS} blurb="Cari dua angka yang jumlahnya pas target!">
          {(answer) => <JumlahView data={config.jumlah ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "ingat":
      return (
        <RaceShell
          {...shell}
          mode="ingat"
          seconds={INGAT_SECONDS}
          blurb="Hafalkan deret angka lalu ketik ulang!"
          notice="Makin panjang deret yang berhasil kamu ingat, makin besar poinnya."
        >
          {(answer) => <IngatView data={config.ingat ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "banyak":
      return (
        <RaceShell {...shell} mode="banyak" seconds={BANYAK_SECONDS} blurb="Mana yang emojinya lebih banyak?">
          {(answer) => <BanyakView data={config.banyak ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "kali":
      return (
        <RaceShell {...shell} mode="kali" seconds={KALI_SECONDS} blurb="Tap semua kelipatan yang diminta!">
          {(answer) => <KaliView data={config.kali ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "cek":
      return (
        <RaceShell {...shell} mode="cek" seconds={CEK_SECONDS} blurb="Persamaan ini benar atau salah?">
          {(answer) => <CekView data={config.cek ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "kembar":
      return (
        <RaceShell {...shell} mode="kembar" seconds={KEMBAR_SECONDS} blurb="Cari dua emoji yang kembar!">
          {(answer) => <KembarView data={config.kembar ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    case "urut":
      return (
        <RaceShell {...shell} mode="urut" seconds={URUT_SECONDS} blurb="Urutkan angka secepat kilat!">
          {(answer) => <UrutView data={config.urut ?? []} onAnswer={answer} />}
        </RaceShell>
      );
    default:
      return (
        <RaceShell {...shell} mode="arah" seconds={ARAH_SECONDS} blurb="Ikuti panah, tapi awas aturan BALIK ARAH!">
          {(answer) => <ArahView data={config.arah ?? []} onAnswer={answer} />}
        </RaceShell>
      );
  }
}
