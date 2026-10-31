"use client";

// =====================================================
// GeserGame — Puzzle Geser 3x3 (solo)
//
// 120 detik. Tap kotak di sebelah ruang kosong untuk menggesernya sampai
// urut 1-8. Selesai = 400 + bonus waktu + bonus sedikit langkah.
// Belum selesai = 20 poin per kotak yang sudah pas.
// =====================================================

import { useRef, useState } from "react";
import {
  GESER_SECONDS as SECONDS,
  GESER_SOLVED as SOLVED,
  buildGeserBoard as shuffled,
  geserCorrect as countCorrect,
  geserNeighbours as neighbours,
  geserSolveScore,
} from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function GeserGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "geser");

  const [phase, setPhase] = useState<Phase>("start");
  const [tiles, setTiles] = useState<number[]>(SOLVED);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number, didSolve: boolean) => {
    setScore(finalScore);
    setSolved(didSolve);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setTiles(shuffled());
    setMoves(0);
    setScore(0);
    setSolved(false);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    endRef.current = nowMs() + SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(countCorrect(tiles) * 20, false);
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const tap = (i: number) => {
    const blank = tiles.indexOf(0);
    if (!neighbours(blank).includes(i)) return;
    const next = [...tiles];
    next[blank] = next[i];
    next[i] = 0;
    const m = moves + 1;
    setTiles(next);
    setMoves(m);
    if (next.every((v, k) => v === SOLVED[k])) {
      const secs = Math.floor((endRef.current - nowMs()) / 1000);
      finish(geserSolveScore(secs, m), true);
    }
  };

  if (phase === "start") return <StartCard game="geser" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="geser"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={solved ? `Selesai dalam ${moves} langkah` : `Waktu habis · ${countCorrect(tiles)}/8 kotak pas`}
        onAgain={start}
      />
    );
  }

  const live = countCorrect(tiles) * 20;
  return (
    <div className="max-w-xs mx-auto select-none">
      <Hud score={live} combo={0} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-right text-xs font-bold text-slate-500">{moves} langkah</p>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-200 p-2.5">
        {tiles.map((v, i) =>
          v === 0 ? (
            <div key={i} className="aspect-square rounded-xl bg-slate-300/60" />
          ) : (
            <button
              key={i}
              type="button"
              onPointerDown={() => tap(i)}
              className={`aspect-square rounded-xl text-3xl font-black shadow-md transition active:scale-90 ${
                v === SOLVED[i]
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                  : "bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white"
              }`}
            >
              {v}
            </button>
          ),
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">Hijau = sudah di posisi yang benar</p>
    </div>
  );
}
