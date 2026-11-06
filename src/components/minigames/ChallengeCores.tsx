"use client";

// =====================================================
// ChallengeCores — papan permainan yang lebih menantang, dipakai bersama
// oleh versi solo dan multiplayer: Sudoku Mini, Menara Hanoi, Kode Biner.
// =====================================================

import { useEffect, useRef, useState } from "react";
import type { BinerRound, HanoiRound, SudokuRound } from "@/lib/mp-content";

interface CoreProps<R> {
  rounds: R[];
  /** Dipanggil tiap satu ronde selesai. n = jumlah ronde selesai. */
  onScore: (score: number, n: number) => void;
  /** Dipanggil sekali saat semua ronde selesai. */
  onDone: (score: number) => void;
}

const nowMs = () => Date.now();
const secsSince = (t: number) => (nowMs() - t) / 1000;

function Header({ round, total, score }: { round: number; total: number; score: number }) {
  return (
    <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
      <span>
        Ronde {round + 1}/{total}
      </span>
      <span className="text-indigo-600">Skor {score}</span>
    </div>
  );
}

// ─── Sudoku Mini 4x4 ─────────────────────────────────

function sudokuConflict(cells: number[], i: number): boolean {
  const v = cells[i];
  if (!v) return false;
  const r = Math.floor(i / 4);
  const c = i % 4;
  return cells.some((w, j) => {
    if (j === i || w !== v) return false;
    const rr = Math.floor(j / 4);
    const cc = j % 4;
    return rr === r || cc === c || (Math.floor(rr / 2) === Math.floor(r / 2) && Math.floor(cc / 2) === Math.floor(c / 2));
  });
}

export function SudokuCore({ rounds, onScore, onDone }: CoreProps<SudokuRound>) {
  const [round, setRound] = useState(0);
  const [cells, setCells] = useState<number[]>(rounds[0]?.[0] ?? []);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const startRef = useRef(nowMs());

  const cur = rounds[round];

  const place = (d: number) => {
    if (!cur || sel === null || cur[0][sel] !== 0) return;
    const next = cells.map((v, i) => (i === sel ? d : v));
    setCells(next);
    const solved = next.every((v, i) => v !== 0 && !sudokuConflict(next, i));
    if (!solved) return;
    const total = score + 150 + Math.max(0, Math.round(120 - secsSince(startRef.current)));
    setScore(total);
    onScore(total, round + 1);
    if (round + 1 >= rounds.length) {
      onDone(total);
      return;
    }
    setRound(round + 1);
    setCells(rounds[round + 1][0]);
    setSel(null);
    startRef.current = nowMs();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") place(Number(e.key));
      else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") place(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!cur) return null;

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <Header round={round} total={rounds.length} score={score} />
      <div className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden border-2 border-slate-700">
        {cells.map((v, i) => {
          const given = cur[0][i] !== 0;
          const bad = sudokuConflict(cells, i);
          const r = Math.floor(i / 4);
          const c = i % 4;
          return (
            <button
              key={i}
              type="button"
              onPointerDown={() => setSel(i)}
              className={`aspect-square text-2xl font-black border border-slate-300 ${
                c === 1 ? "border-r-2 border-r-slate-700" : ""
              } ${r === 1 ? "border-b-2 border-b-slate-700" : ""} ${
                sel === i ? "bg-indigo-100" : given ? "bg-slate-100" : "bg-white"
              } ${bad ? "text-red-500" : given ? "text-slate-900" : "text-indigo-600"}`}
            >
              {v || ""}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 0].map((d) => (
          <button
            key={d}
            type="button"
            onPointerDown={() => place(d)}
            className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:scale-90"
          >
            {d || "⌫"}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Tiap baris, kolom, dan kotak tebal 2x2 berisi angka 1-4 tanpa ulang. Makin cepat makin besar bonus.</p>
    </div>
  );
}

// ─── Menara Hanoi ────────────────────────────────────

export function HanoiCore({ rounds, onScore, onDone }: CoreProps<HanoiRound>) {
  const startPegs = (n: number) => [Array.from({ length: n }, (_, i) => n - i), [], []] as number[][];
  const [round, setRound] = useState(0);
  const [pegs, setPegs] = useState<number[][]>(() => startPegs(rounds[0]?.[0] ?? 3));
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [bad, setBad] = useState(false);

  const cur = rounds[round];
  if (!cur) return null;
  const n = cur[0];
  const opt = 2 ** n - 1;

  const tap = (p: number) => {
    if (sel === null) {
      if (pegs[p].length) setSel(p);
      return;
    }
    if (sel === p) {
      setSel(null);
      return;
    }
    const disk = pegs[sel][pegs[sel].length - 1];
    const top = pegs[p][pegs[p].length - 1];
    if (top !== undefined && top < disk) {
      setBad(true);
      setTimeout(() => setBad(false), 300);
      setSel(null);
      return;
    }
    const next = pegs.map((peg, i) => (i === sel ? peg.slice(0, -1) : i === p ? [...peg, disk] : peg));
    const m = moves + 1;
    setPegs(next);
    setSel(null);
    setMoves(m);
    if (next[2].length !== n) return;
    const total = score + 100 + Math.max(0, 100 - 6 * (m - opt));
    setScore(total);
    onScore(total, round + 1);
    if (round + 1 >= rounds.length) {
      onDone(total);
      return;
    }
    setRound(round + 1);
    setPegs(startPegs(rounds[round + 1][0]));
    setMoves(0);
  };

  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <Header round={round} total={rounds.length} score={score} />
      <p className="text-sm font-bold text-slate-500">
        Pindahkan semua cakram ke tiang kanan · {moves} langkah (minimum {opt})
      </p>
      <div className={`mt-3 grid grid-cols-3 gap-2 ${bad ? "animate-pulse" : ""}`}>
        {pegs.map((peg, p) => (
          <button
            key={p}
            type="button"
            onPointerDown={() => tap(p)}
            className={`relative flex h-52 flex-col-reverse items-center gap-1 rounded-xl border-2 px-1 pb-2 pt-2 ${
              sel === p ? "border-indigo-500 bg-indigo-50" : bad ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"
            }`}
          >
            <span className="absolute inset-y-3 left-1/2 w-1.5 -translate-x-1/2 rounded bg-slate-300" />
            {peg.map((d) => (
              <span
                key={d}
                className="relative z-10 h-5 rounded-md bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow"
                style={{ width: `${25 + d * 14}%` }}
              />
            ))}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Tap tiang asal lalu tiang tujuan. Cakram besar tidak boleh di atas yang kecil.</p>
    </div>
  );
}

// ─── Kode Biner ──────────────────────────────────────

export function BinerCore({ rounds, onScore, onDone }: CoreProps<BinerRound>) {
  const [round, setRound] = useState(0);
  const [bits, setBits] = useState<boolean[]>(() => Array(rounds[0]?.[1] ?? 4).fill(false));
  const [score, setScore] = useState(0);
  const startRef = useRef(nowMs());

  const cur = rounds[round];
  if (!cur) return null;
  const [target, width] = cur;
  const weights = Array.from({ length: width }, (_, i) => 2 ** (width - 1 - i));
  const sum = bits.reduce((s, on, i) => s + (on ? weights[i] : 0), 0);
  const hideSum = round >= 4;

  const toggle = (i: number) => {
    const next = bits.map((b, k) => (k === i ? !b : b));
    setBits(next);
    const v = next.reduce((s, on, k) => s + (on ? weights[k] : 0), 0);
    if (v !== target) return;
    const total = score + Math.max(20, Math.round(100 - secsSince(startRef.current) * 4)) + width * 5;
    setScore(total);
    onScore(total, round + 1);
    if (round + 1 >= rounds.length) {
      onDone(total);
      return;
    }
    setRound(round + 1);
    setBits(Array(rounds[round + 1][1]).fill(false));
    startRef.current = nowMs();
  };

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <Header round={round} total={rounds.length} score={score} />
      <p className="text-sm font-bold text-slate-500">Nyalakan bit sehingga jumlahnya sama dengan</p>
      <div className="mt-1 rounded-2xl border-2 border-slate-200 bg-white py-4 text-6xl font-black text-slate-900">{target}</div>
      <p className="mt-1 text-xs text-slate-400">
        {hideSum ? "Jumlah sementara disembunyikan 🙈" : `Jumlah sementara: ${sum}`}
      </p>
      <div className="mt-3 flex justify-center gap-1.5">
        {bits.map((on, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => toggle(i)}
            className={`flex w-12 flex-col items-center rounded-xl border-2 py-2 transition active:scale-90 ${
              on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span className="text-2xl font-black">{on ? 1 : 0}</span>
            <span className="text-[11px] font-bold">{weights[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
