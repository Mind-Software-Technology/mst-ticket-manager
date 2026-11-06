"use client";

// =====================================================
// HartaGame — Cari Harta (solo)
//
// Papan 6x6, 45 detik. Permata +40, emas +100, bom -40. Kotak kosong
// menampilkan jumlah permata/emas di sekitarnya.
// =====================================================

import { useRef, useState } from "react";
import { HARTA_POINTS, HARTA_SECONDS, HARTA_SIZE, buildHartaGrid, hartaNear } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const nowMs = () => Date.now();
const ICON = ["", "💎", "💣", "🪙"];
const EMPTY = () => Array<boolean>(HARTA_SIZE * HARTA_SIZE).fill(false);

export function HartaGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "harta");

  const [phase, setPhase] = useState<Phase>("start");
  const [grid, setGrid] = useState<number[]>([]);
  const [opened, setOpened] = useState<boolean[]>(EMPTY);
  const [score, setScore] = useState(0);
  const [treasure, setTreasure] = useState(0);
  const [timeLeft, setTimeLeft] = useState(HARTA_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setGrid(buildHartaGrid());
    setOpened(EMPTY());
    setScore(0);
    setTreasure(0);
    setIsRecord(false);
    setTimeLeft(HARTA_SECONDS);
    endRef.current = nowMs() + HARTA_SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const dig = (i: number) => {
    if (opened[i]) return;
    const v = grid[i] as 0 | 1 | 2 | 3;
    setOpened((o) => o.map((x, k) => (k === i ? true : x)));
    setScore((s) => Math.max(0, s + HARTA_POINTS[v]));
    if (v === 1 || v === 3) setTreasure((t) => t + 1);
  };

  if (phase === "start") return <StartCard game="harta" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="harta"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${treasure} harta ditemukan · ${opened.filter(Boolean).length} kotak dibuka`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <Hud score={score} combo={0} fraction={timeLeft / HARTA_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="grid grid-cols-6 gap-1.5 rounded-2xl bg-amber-900/80 p-2">
        {grid.map((v, i) => (
          <button
            key={i}
            type="button"
            disabled={opened[i]}
            aria-label={`Kotak ${i + 1}`}
            onPointerDown={() => dig(i)}
            className={`aspect-square rounded-lg text-xl font-black transition ${
              opened[i] ? "bg-amber-100" : "bg-amber-600 hover:bg-amber-500 active:scale-90"
            }`}
          >
            {opened[i] ? (v === 0 ? <span className="text-sm text-slate-500">{hartaNear(grid, i) || ""}</span> : ICON[v]) : ""}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Angka = jumlah 💎/🪙 di 8 kotak sekitarnya</p>
    </div>
  );
}
