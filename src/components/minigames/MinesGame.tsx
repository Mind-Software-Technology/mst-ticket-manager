"use client";

// =====================================================
// MinesGame — Cari Ranjau (solo, gaya Minesweeper)
//
// Papan 9x9 berisi 10 ranjau. Buka kotak aman; angka = jumlah ranjau di
// 8 kotak sekitarnya. Klik pertama selalu aman. Menang = semua kotak aman
// terbuka. Skor menang: 500 + bonus waktu (batas 300 detik); kalah:
// 5 poin per kotak aman yang sempat dibuka.
// =====================================================

import { useRef, useState } from "react";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
interface Cell {
  mine: boolean;
  adj: number;
  open: boolean;
  flag: boolean;
}

const SIZE = 9;
const MINES = 10;
const TIME_CAP = 300;
const NUM_COLOR = [
  "",
  "text-blue-600",
  "text-emerald-600",
  "text-red-500",
  "text-indigo-800",
  "text-amber-700",
  "text-cyan-600",
  "text-slate-800",
  "text-slate-500",
];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

const blank = (): Cell[] => Array.from({ length: SIZE * SIZE }, () => ({ mine: false, adj: 0, open: false, flag: false }));

function neighbors(i: number): number[] {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
    }
  }
  return out;
}

/** Tebar ranjau setelah klik pertama; kotak yang diklik dan sekitarnya dijamin aman. */
function plant(safe: number): Cell[] {
  const cells = blank();
  const banned = new Set([safe, ...neighbors(safe)]);
  const spots = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((i) => !banned.has(i));
  for (let k = spots.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [spots[k], spots[j]] = [spots[j], spots[k]];
  }
  spots.slice(0, MINES).forEach((i) => (cells[i].mine = true));
  cells.forEach((cell, i) => (cell.adj = neighbors(i).filter((n) => cells[n].mine).length));
  return cells;
}

/** Buka kotak; kotak kosong (adj 0) membuka tetangganya secara berantai. */
function reveal(cells: Cell[], from: number): Cell[] {
  const next = cells.map((c) => ({ ...c }));
  const stack = [from];
  while (stack.length) {
    const i = stack.pop() as number;
    const cell = next[i];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.adj === 0 && !cell.mine) stack.push(...neighbors(i));
  }
  return next;
}

export function MinesGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "ranjau");

  const [phase, setPhase] = useState<Phase>("start");
  const [cells, setCells] = useState<Cell[]>(blank);
  const [planted, setPlanted] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [took, setTook] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const startRef = useRef(0);

  const start = () => {
    setCells(blank());
    setPlanted(false);
    setFlagMode(false);
    setElapsed(0);
    setScore(0);
    setWon(false);
    setTook(0);
    setIsRecord(false);
    setPhase("play");
  };

  const finish = (board: Cell[], win: boolean) => {
    const safeOpen = board.filter((c) => c.open && !c.mine).length;
    const sec = (nowMs() - startRef.current) / 1000;
    const final = win ? 500 + Math.round(Math.max(0, TIME_CAP - sec) * 3) : safeOpen * 5;
    setCells(board.map((c) => (c.mine ? { ...c, open: true } : c)));
    setWon(win);
    setTook(Math.round(sec));
    setScore(final);
    setIsRecord(submit(final));
    setPhase("result");
  };

  useInterval(
    () => {
      const sec = Math.floor((nowMs() - startRef.current) / 1000);
      if (sec >= TIME_CAP) finish(cells, false);
      else setElapsed(sec);
    },
    phase === "play" && planted ? 500 : null,
  );

  const tap = (i: number) => {
    if (phase !== "play") return;
    let board = cells;
    if (!planted) {
      // Klik pertama selalu membuka dulu, bendera tidak berlaku.
      board = plant(i);
      setPlanted(true);
      startRef.current = nowMs();
    } else if (flagMode || board[i].flag) {
      if (board[i].open) return;
      board = board.map((c, k) => (k === i ? { ...c, flag: !c.flag } : c));
      setCells(board);
      return;
    }
    if (board[i].open) return;
    if (board[i].mine) {
      finish(board.map((c, k) => (k === i ? { ...c, open: true } : c)), false);
      return;
    }
    const next = reveal(board, i);
    setCells(next);
    if (next.every((c) => c.mine || c.open)) finish(next, true);
  };

  const flagAt = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    if (phase !== "play" || !planted || cells[i].open) return;
    setCells(cells.map((c, k) => (k === i ? { ...c, flag: !c.flag } : c)));
  };

  if (phase === "start") return <StartCard game="ranjau" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    const safeOpen = cells.filter((c) => c.open && !c.mine).length;
    return (
      <ResultCard
        game="ranjau"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={won ? `Menang dalam ${took} detik 🎉` : `Meledak! ${safeOpen}/${SIZE * SIZE - MINES} kotak aman terbuka`}
        onAgain={start}
      />
    );
  }

  const flags = cells.filter((c) => c.flag).length;

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">💣 {MINES - flags}</span>
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          className={`rounded-lg border px-3 py-1 text-xs font-bold transition ${
            flagMode ? "border-red-300 bg-red-50 text-red-600" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {flagMode ? "🚩 Mode bendera" : "⛏️ Mode gali"}
        </button>
        <span className="text-slate-500">⏱ {elapsed}s</span>
      </div>

      <div className="grid gap-0.5 rounded-2xl bg-slate-300 p-1" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tap(i)}
            onContextMenu={(e) => flagAt(e, i)}
            className={`flex aspect-square items-center justify-center rounded-md text-sm font-black transition sm:text-base ${
              c.open
                ? c.mine
                  ? "bg-red-200"
                  : "bg-slate-50"
                : "bg-gradient-to-br from-indigo-400 to-indigo-500 hover:from-indigo-300 hover:to-indigo-400 active:scale-95"
            } ${c.open && !c.mine ? NUM_COLOR[c.adj] : ""}`}
          >
            {c.open ? (c.mine ? "💣" : c.adj || "") : c.flag ? "🚩" : ""}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">
        Klik pertama selalu aman · klik kanan atau Mode bendera untuk menandai ranjau
      </p>
    </div>
  );
}
