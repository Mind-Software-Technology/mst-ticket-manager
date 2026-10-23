"use client";

// =====================================================
// Game2048 — Gabung 2048 (solo)
//
// Geser papan 4x4 (panah / WASD / swipe / tombol). Dua kotak sama
// bergabung dan jadi dua kali lipat. Skor = jumlah semua hasil gabungan.
// Selesai kalau papan penuh dan tidak ada gerakan lagi.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { ResultCard, StartCard, useBest } from "./GameParts";

type Phase = "start" | "play" | "result";
type Dir = "L" | "R" | "U" | "D";
type Board = number[][];

const SIZE = 4;
const SWIPE_MIN = 30;

const TILE_STYLE: Record<number, string> = {
  0: "bg-slate-200/70",
  2: "bg-amber-50 text-slate-700",
  4: "bg-amber-100 text-slate-700",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-lime-500 text-white",
  1024: "bg-emerald-500 text-white",
  2048: "bg-indigo-600 text-white",
};

const emptyBoard = (): Board => Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0));

function spawn(board: Board): Board {
  const free: Array<[number, number]> = [];
  board.forEach((row, r) => row.forEach((v, c) => v === 0 && free.push([r, c])));
  if (free.length === 0) return board;
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slide(line: number[]): { line: number[]; gain: number } {
  const tiles = line.filter(Boolean);
  const out: number[] = [];
  let gain = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gain += tiles[i] * 2;
      i++;
    } else out.push(tiles[i]);
  }
  while (out.length < SIZE) out.push(0);
  return { line: out, gain };
}

/** Posisi sel sepanjang satu garis, mulai dari sisi tujuan geseran. */
function lineCells(dir: Dir, i: number): Array<[number, number]> {
  const idx = Array.from({ length: SIZE }, (_, k) => k);
  switch (dir) {
    case "L":
      return idx.map((k) => [i, k]);
    case "R":
      return idx.map((k) => [i, SIZE - 1 - k]);
    case "U":
      return idx.map((k) => [k, i]);
    default:
      return idx.map((k) => [SIZE - 1 - k, i]);
  }
}

function move(board: Board, dir: Dir): { board: Board; gain: number; moved: boolean } {
  const next = emptyBoard();
  let gain = 0;
  let moved = false;
  for (let i = 0; i < SIZE; i++) {
    const cells = lineCells(dir, i);
    const res = slide(cells.map(([r, c]) => board[r][c]));
    gain += res.gain;
    cells.forEach(([r, c], k) => {
      next[r][c] = res.line[k];
      if (next[r][c] !== board[r][c]) moved = true;
    });
  }
  return { board: next, gain, moved };
}

const hasMoves = (board: Board) => (["L", "R", "U", "D"] as const).some((d) => move(board, d).moved);

export function Game2048({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "g2048");

  const [phase, setPhase] = useState<Phase>("start");
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const moveRef = useRef<(d: Dir) => void>(() => {});
  const touch = useRef<{ x: number; y: number } | null>(null);

  const start = () => {
    setBoard(spawn(spawn(emptyBoard())));
    setScore(0);
    setIsRecord(false);
    setPhase("play");
  };

  useEffect(() => {
    moveRef.current = (dir) => {
      if (phase !== "play") return;
      const res = move(board, dir);
      if (!res.moved) return;
      const next = spawn(res.board);
      const total = score + res.gain;
      setBoard(next);
      setScore(total);
      if (!hasMoves(next)) {
        setIsRecord(submit(total));
        setPhase("result");
      }
    };
  });

  useEffect(() => {
    if (phase !== "play") return;
    const keys: Record<string, Dir> = {
      arrowleft: "L",
      a: "L",
      arrowright: "R",
      d: "R",
      arrowup: "U",
      w: "U",
      arrowdown: "D",
      s: "D",
    };
    const onKey = (e: KeyboardEvent) => {
      const dir = keys[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      moveRef.current(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "start") return <StartCard game="g2048" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="g2048"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`Kotak tertinggi: ${Math.max(...board.flat())}`}
        onAgain={start}
      />
    );
  }

  const onUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    moveRef.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : dy > 0 ? "D" : "U");
  };

  const pad = "flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:scale-90 transition";

  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        {best > 0 && <span className="text-amber-600">🏅 {best}</span>}
      </div>

      <div
        className="grid touch-none grid-cols-4 gap-2 rounded-2xl bg-slate-300 p-2"
        onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={onUp}
        onPointerCancel={() => (touch.current = null)}
      >
        {board.flat().map((v, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-lg font-black transition-colors ${
              v >= 1024 ? "text-xl" : v >= 128 ? "text-2xl" : "text-3xl"
            } ${TILE_STYLE[v] ?? "bg-indigo-800 text-white"}`}
          >
            {v || ""}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 justify-items-center gap-1.5 sm:hidden">
        <span />
        <button type="button" className={pad} onClick={() => moveRef.current("U")} aria-label="Atas">
          <ArrowUp className="h-5 w-5" />
        </button>
        <span />
        <button type="button" className={pad} onClick={() => moveRef.current("L")} aria-label="Kiri">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onClick={() => moveRef.current("D")} aria-label="Bawah">
          <ArrowDown className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onClick={() => moveRef.current("R")} aria-label="Kanan">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Panah / WASD / geser layar</p>
    </div>
  );
}
