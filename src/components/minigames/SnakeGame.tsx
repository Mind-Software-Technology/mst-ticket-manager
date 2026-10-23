"use client";

// =====================================================
// SnakeGame — Ular Lapar (solo)
//
// Ular bergerak terus di papan 15x15. Makan 🍎 +10 dan ular memanjang
// serta makin cepat. Menabrak dinding atau badan sendiri = selesai.
// Kontrol: panah / WASD / swipe / tombol arah.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
type Dir = "L" | "R" | "U" | "D";
type Cell = readonly [number, number];

const SIZE = 15;
const SWIPE_MIN = 24;
const STEP: Record<Dir, Cell> = { L: [0, -1], R: [0, 1], U: [-1, 0], D: [1, 0] };
const OPPOSITE: Record<Dir, Dir> = { L: "R", R: "L", U: "D", D: "U" };

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

function placeFood(snake: Cell[]): Cell {
  const free: Cell[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!snake.some((s) => same(s, [r, c]))) free.push([r, c]);
  return free[Math.floor(Math.random() * free.length)] ?? [0, 0];
}

const initialSnake = (): Cell[] => [
  [7, 7],
  [7, 6],
  [7, 5],
];

export function SnakeGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "ular");

  const [phase, setPhase] = useState<Phase>("start");
  const [snake, setSnake] = useState<Cell[]>(initialSnake);
  const [food, setFood] = useState<Cell>([7, 11]);
  const [score, setScore] = useState(0);
  const [isRecord, setIsRecord] = useState(false);

  const dir = useRef<Dir>("R");
  /** Arah terakhir yang benar-benar dijalankan; mencegah putar balik 180° dalam satu langkah. */
  const moved = useRef<Dir>("R");
  const touch = useRef<{ x: number; y: number } | null>(null);
  const turnRef = useRef<(d: Dir) => void>(() => {});

  const start = () => {
    const s = initialSnake();
    setSnake(s);
    setFood(placeFood(s));
    setScore(0);
    setIsRecord(false);
    dir.current = "R";
    moved.current = "R";
    setPhase("play");
  };

  useEffect(() => {
    turnRef.current = (d) => {
      if (d !== OPPOSITE[moved.current]) dir.current = d;
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
      const d = keys[e.key.toLowerCase()];
      if (!d) return;
      e.preventDefault();
      turnRef.current(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const speed = Math.max(70, 150 - Math.floor(score / 50) * 10);

  useInterval(
    () => {
      const d = dir.current;
      moved.current = d;
      const head: Cell = [snake[0][0] + STEP[d][0], snake[0][1] + STEP[d][1]];
      const eats = same(head, food);
      // Ekor ikut maju kalau tidak makan, jadi boleh menempati sel ekor lama.
      const body = eats ? snake : snake.slice(0, -1);
      const hit = head[0] < 0 || head[0] >= SIZE || head[1] < 0 || head[1] >= SIZE || body.some((s) => same(s, head));
      if (hit) {
        setIsRecord(submit(score));
        setPhase("result");
        return;
      }
      const next = [head, ...body];
      setSnake(next);
      if (eats) {
        setScore((s) => s + 10);
        setFood(placeFood(next));
      }
    },
    phase === "play" ? speed : null,
  );

  if (phase === "start") return <StartCard game="ular" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="ular"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`Panjang ular: ${snake.length}`}
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
    turnRef.current(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : dy > 0 ? "D" : "U");
  };

  const pad = "flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:scale-90 transition";

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className="text-slate-500">🐍 {snake.length}</span>
        {best > 0 && <span className="text-amber-600">🏅 {best}</span>}
      </div>

      <div
        className="grid touch-none gap-px rounded-2xl bg-slate-300 p-1"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={onUp}
        onPointerCancel={() => (touch.current = null)}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const cell: Cell = [Math.floor(i / SIZE), i % SIZE];
          const isHead = same(snake[0], cell);
          const isBody = !isHead && snake.some((s) => same(s, cell));
          const isFood = same(food, cell);
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center text-[10px] sm:text-xs ${
                isHead
                  ? "rounded-md bg-emerald-600"
                  : isBody
                    ? "rounded-sm bg-emerald-400"
                    : (cell[0] + cell[1]) % 2
                      ? "bg-slate-100"
                      : "bg-white"
              }`}
            >
              {isFood ? "🍎" : ""}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 justify-items-center gap-1.5 sm:hidden">
        <span />
        <button type="button" className={pad} onClick={() => turnRef.current("U")} aria-label="Atas">
          <ArrowUp className="h-5 w-5" />
        </button>
        <span />
        <button type="button" className={pad} onClick={() => turnRef.current("L")} aria-label="Kiri">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onClick={() => turnRef.current("D")} aria-label="Bawah">
          <ArrowDown className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onClick={() => turnRef.current("R")} aria-label="Kanan">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">Panah / WASD / geser layar</p>
    </div>
  );
}
