"use client";

// =====================================================
// QuickViews — tampilan inti Cari Angka, Jumlah Pas, Ingat Angka,
// Banyak Mana, dan Arah Terbalik. Dipakai bersama oleh mode solo
// (SoloShell) dan bareng (RaceShell); soalnya datang lewat `data`.
// =====================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "@/lib/minigame";
import {
  BANYAK_EMOJI,
  BANYAK_SLOTS,
  INGAT_MAX,
  angkaCols,
  angkaPoints,
  type AngkaRound,
  type ArahItem,
  type BanyakItem,
  type JumlahItem,
} from "@/lib/mp-content";
import type { Answer } from "./GameShells";
import { useSideKeys, type Side } from "./BesarGame";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

/** Pasang listener keyboard selagi `active`; handler selalu yang terbaru. */
function useKeys(active: boolean, onKey: (e: KeyboardEvent) => void) {
  const ref = useRef(onKey);
  useEffect(() => {
    ref.current = onKey;
  });
  useEffect(() => {
    if (!active) return;
    const fn = (e: KeyboardEvent) => ref.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [active]);
}

/** PRNG kecil supaya tata letak emoji sama untuk semua pemain. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Cari Angka ──────────────────────────────────────

function AngkaBoard({ round, onDone }: { round: AngkaRound; onDone: (ok: boolean, ms: number) => void }) {
  const [prompt, cells, answer] = round;
  const [order, setOrder] = useState(cells);
  const [flash, setFlash] = useState<number | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = nowMs();
  }, []);

  const tap = (n: number) => {
    const ms = nowMs() - startRef.current;
    if (n === answer) {
      onDone(true, ms);
      return;
    }
    setFlash(n);
    setTimeout(() => setFlash(null), 250);
    setOrder((o) => shuffle(o));
    onDone(false, ms);
  };

  const small = order.length > 16;
  return (
    <div>
      <p className="mb-3 rounded-xl bg-indigo-50 px-3 py-2 text-center text-base font-black text-indigo-700">{prompt}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${angkaCols(order.length)}, minmax(0, 1fr))` }}>
        {order.map((n) => (
          <button
            key={n}
            type="button"
            onPointerDown={() => tap(n)}
            className={`aspect-square rounded-xl font-black text-white shadow-md transition active:scale-95 ${
              small ? "text-lg" : "text-2xl"
            } ${flash === n ? "bg-red-500" : "bg-gradient-to-br from-indigo-500 to-fuchsia-500"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AngkaView({ data, onAnswer }: { data: AngkaRound[]; onAnswer: Answer }) {
  const [index, setIndex] = useState(0);
  const round = data[index];
  if (!round) return <p className="py-10 text-center font-bold text-slate-500">Semua ronde beres! 🎉</p>;
  return (
    <div>
      <p className="mb-1 text-center text-xs font-bold text-slate-400">Level {index + 1}</p>
      <AngkaBoard
        key={index}
        round={round}
        onDone={(ok, ms) => {
          if (ok) {
            onAnswer(angkaPoints(index, ms), true);
            setIndex(index + 1);
          } else onAnswer(-5, false);
        }}
      />
    </div>
  );
}

// ─── Jumlah Pas ──────────────────────────────────────

export function JumlahView({ data, onAnswer }: { data: JumlahItem[]; onAnswer: Answer }) {
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [bad, setBad] = useState<number | null>(null);
  const item = data[index];
  if (!item) return null;
  const [target, nums] = item;

  const tap = (i: number) => {
    if (sel === null) {
      setSel(i);
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    if (nums[sel] + nums[i] === target) {
      onAnswer(15, true);
      setSel(null);
      setIndex(index + 1);
    } else {
      onAnswer(-5, false);
      setBad(i);
      setTimeout(() => setBad(null), 250);
      setSel(null);
    }
  };

  return (
    <div>
      <p className="mb-3 text-center text-sm font-bold text-slate-500">
        Pilih dua angka yang jumlahnya <span className="text-3xl font-black text-indigo-600">{target}</span>
      </p>
      <div className="grid grid-cols-4 gap-2">
        {nums.map((n, i) => (
          <button
            key={`${index}-${i}`}
            type="button"
            onPointerDown={() => tap(i)}
            className={`aspect-[4/3] rounded-xl text-2xl font-black shadow-md transition active:scale-95 ${
              bad === i
                ? "bg-red-500 text-white"
                : sel === i
                  ? "bg-amber-400 text-white ring-4 ring-amber-200"
                  : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Ingat Angka ─────────────────────────────────────

type IngatPhase = "show" | "input" | "fb";

export function IngatView({ data, onAnswer }: { data: string[]; onAnswer: Answer }) {
  const [idx, setIdx] = useState(0);
  const [len, setLen] = useState(3);
  const [phase, setPhase] = useState<IngatPhase>("show");
  const [typed, setTyped] = useState("");
  const [ok, setOk] = useState(true);

  const seq = (data[idx % data.length] ?? "").slice(0, len);

  // Tampil sebentar (makin panjang makin lama), lalu sembunyi.
  useEffect(() => {
    if (phase !== "show") return;
    const id = setTimeout(() => setPhase("input"), 700 + len * 450);
    return () => clearTimeout(id);
  }, [phase, idx, len]);

  // Umpan balik singkat, lalu putaran berikutnya.
  useEffect(() => {
    if (phase !== "fb") return;
    const id = setTimeout(() => {
      setLen(ok ? Math.min(INGAT_MAX, len + 1) : Math.max(3, len - 1));
      setIdx(idx + 1);
      setTyped("");
      setPhase("show");
    }, 700);
    return () => clearTimeout(id);
  }, [phase, ok, len, idx]);

  const press = (d: string) => {
    if (phase !== "input") return;
    const next = typed + d;
    setTyped(next);
    if (next.length >= len) {
      const good = next === seq;
      setOk(good);
      onAnswer(good ? len * 10 : 0, good);
      setPhase("fb");
    }
  };
  const back = () => phase === "input" && setTyped((t) => t.slice(0, -1));

  useKeys(phase === "input", (e) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") back();
  });

  return (
    <div className="text-center">
      <p className="text-xs font-bold text-slate-400">Deret {len} digit</p>
      <div className="my-3 flex h-20 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white">
        {phase === "show" ? (
          <span className="text-4xl font-black tracking-[0.3em] text-indigo-600">{seq}</span>
        ) : (
          <span
            className={`text-4xl font-black tracking-[0.3em] ${
              phase === "fb" ? (ok ? "text-emerald-500" : "text-red-500") : "text-slate-800"
            }`}
          >
            {phase === "fb" && !ok ? seq : typed || "·".repeat(len)}
          </span>
        )}
      </div>
      <p className="mb-2 h-5 text-sm font-bold text-slate-500">
        {phase === "show" ? "Hafalkan…" : phase === "input" ? "Ketik ulang!" : ok ? "Benar! ✅" : "Salah ❌ jawabannya di atas"}
      </p>
      <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            onPointerDown={() => press(d)}
            className="h-12 rounded-xl bg-slate-100 text-xl font-black text-slate-800 active:scale-95 active:bg-indigo-100"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onPointerDown={() => press("0")}
          className="h-12 rounded-xl bg-slate-100 text-xl font-black text-slate-800 active:scale-95 active:bg-indigo-100"
        >
          0
        </button>
        <button
          type="button"
          onPointerDown={back}
          className="h-12 rounded-xl bg-slate-100 text-xl font-black text-slate-500 active:scale-95"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

// ─── Banyak Mana ─────────────────────────────────────

function BanyakBox({ count, emoji, seed, hint, onPick, wrong }: {
  count: number;
  emoji: string;
  seed: number;
  hint: string;
  onPick: () => void;
  wrong: boolean;
}) {
  const filled = useMemo(() => {
    const rnd = mulberry32(seed);
    const slots = Array.from({ length: BANYAK_SLOTS }, (_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return new Set(slots.slice(0, count));
  }, [count, seed]);

  return (
    <button
      type="button"
      onPointerDown={onPick}
      className={`rounded-2xl border-2 bg-white p-2 shadow-sm transition active:scale-95 ${
        wrong ? "border-red-400" : "border-slate-200 hover:border-indigo-300"
      }`}
    >
      <div className="grid grid-cols-5">
        {Array.from({ length: BANYAK_SLOTS }, (_, i) => (
          <span key={i} className="flex aspect-square items-center justify-center text-base leading-none">
            {filled.has(i) ? emoji : ""}
          </span>
        ))}
      </div>
      <span className="mt-1 block text-[11px] font-semibold text-slate-400">{hint}</span>
    </button>
  );
}

export function BanyakView({ data, onAnswer }: { data: BanyakItem[]; onAnswer: Answer }) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const item = data[index];

  const pick = (side: Side) => {
    if (!item) return;
    const correct: Side = item[0] > item[1] ? "L" : "R";
    if (side === correct) onAnswer(10, true);
    else {
      onAnswer(-5, false);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setIndex(index + 1);
  };
  useSideKeys(true, pick);

  if (!item) return null;
  const emoji = BANYAK_EMOJI[item[2]];
  return (
    <div>
      <p className="mb-2 text-center text-xs font-bold text-slate-400">Mana yang emojinya LEBIH BANYAK?</p>
      <div className="grid grid-cols-2 gap-3">
        <BanyakBox key={`${index}L`} count={item[0]} emoji={emoji} seed={item[3]} hint="F / ←" onPick={() => pick("L")} wrong={wrong} />
        <BanyakBox key={`${index}R`} count={item[1]} emoji={emoji} seed={item[3] + 7919} hint="J / →" onPick={() => pick("R")} wrong={wrong} />
      </div>
    </div>
  );
}

// ─── Arah Terbalik ───────────────────────────────────

const ARROWS = ["⬆️", "➡️", "⬇️", "⬅️"];
const KEY_DIR: Record<string, number> = {
  arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3,
};

export function ArahView({ data, onAnswer }: { data: ArahItem[]; onAnswer: Answer }) {
  const [index, setIndex] = useState(0);
  const [wrong, setWrong] = useState(false);
  const item = data[index];

  const pick = (dir: number) => {
    if (!item) return;
    const expected = item[1] ? (item[0] + 2) % 4 : item[0];
    if (dir === expected) onAnswer(10, true);
    else {
      onAnswer(-5, false);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setIndex(index + 1);
  };

  useKeys(true, (e) => {
    const d = KEY_DIR[e.key.toLowerCase()];
    if (d === undefined || e.repeat) return;
    e.preventDefault();
    pick(d);
  });

  if (!item) return null;
  const flip = item[1] === 1;
  const btn = (dir: number, pos: string) => (
    <button
      key={dir}
      type="button"
      onPointerDown={() => pick(dir)}
      className={`${pos} h-16 rounded-2xl bg-slate-100 text-3xl active:scale-95 active:bg-indigo-100`}
    >
      {ARROWS[dir]}
    </button>
  );

  return (
    <div className="text-center">
      <span
        className={`inline-block rounded-full px-4 py-1 text-sm font-black text-white ${flip ? "bg-red-500" : "bg-emerald-500"}`}
      >
        {flip ? "BALIK ARAH 🔄" : "IKUTI ✅"}
      </span>
      <div className={`my-3 text-8xl leading-none transition ${wrong ? "scale-90 opacity-60" : ""}`}>{ARROWS[item[0]]}</div>
      <div className="mx-auto grid max-w-[15rem] grid-cols-3 gap-2">
        {btn(0, "col-start-2")}
        {btn(3, "col-start-1 row-start-2")}
        {btn(1, "col-start-3 row-start-2")}
        {btn(2, "col-start-2 row-start-3")}
      </div>
    </div>
  );
}
