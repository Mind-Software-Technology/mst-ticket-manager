"use client";

// =====================================================
// GeserGame — Puzzle Geser 3x3 (solo)
//
// 120 detik. Tap kotak di sebelah ruang kosong untuk menggesernya sampai
// urut 1-8. Selesai = 400 + bonus waktu + bonus sedikit langkah.
// Belum selesai = 20 poin per kotak yang sudah pas.
// =====================================================

import { useRef, useState } from "react";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

const N = 3;
const SECONDS = 120;
const SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

const neighbours = (blank: number) => {
  const r = Math.floor(blank / N);
  const c = blank % N;
  const out: number[] = [];
  if (r > 0) out.push(blank - N);
  if (r < N - 1) out.push(blank + N);
  if (c > 0) out.push(blank - 1);
  if (c < N - 1) out.push(blank + 1);
  return out;
};

/** Acak lewat gerakan legal dari kondisi selesai, jadi pasti bisa dipecahkan. */
function shuffled(): number[] {
  for (;;) {
    const t = [...SOLVED];
    let blank = 8;
    let prev = -1;
    for (let k = 0; k < 90; k++) {
      const options = neighbours(blank).filter((p) => p !== prev);
      const pick = options[Math.floor(Math.random() * options.length)];
      t[blank] = t[pick];
      t[pick] = 0;
      prev = blank;
      blank = pick;
    }
    if (t.some((v, i) => v !== SOLVED[i])) return t;
  }
}

const countCorrect = (t: number[]) => t.filter((v, i) => v !== 0 && v === SOLVED[i]).length;

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
      finish(400 + secs * 4 + Math.max(0, 200 - m * 2), true);
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
