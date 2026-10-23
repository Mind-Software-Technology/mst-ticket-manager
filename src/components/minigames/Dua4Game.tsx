"use client";

// =====================================================
// Dua4Game — Hitung 24 (solo)
//
// 150 detik, soal tak terbatas: susun 4 angka dengan + − × ÷ dan kurung
// jadi tepat 24 (tiap angka dipakai sekali). Benar = 150 + bonus
// kecepatan (maks +100). Soal yang buntu boleh dilewati.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { DUA4_SECONDS, buildDua4Puzzles, evalExpr } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
interface Token {
  text: string;
  /** Indeks angka di soal (hanya untuk token angka). */
  slot?: number;
}

const SPEED_WINDOW_S = 40;
const OPS: Array<{ text: string; label: string }> = [
  { text: "+", label: "+" },
  { text: "-", label: "−" },
  { text: "*", label: "×" },
  { text: "/", label: "÷" },
  { text: "(", label: "(" },
  { text: ")", label: ")" },
];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function Dua4Game({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "dua4");

  const [phase, setPhase] = useState<Phase>("start");
  const [puzzles, setPuzzles] = useState<number[][]>([]);
  const [idx, setIdx] = useState(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DUA4_SECONDS);
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(false);
  const [isRecord, setIsRecord] = useState(false);

  const startRef = useRef(0);
  const puzzleStart = useRef(0);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const nums = puzzles[idx] ?? [];
  const used = new Set(tokens.flatMap((t) => (t.slot === undefined ? [] : [t.slot])));

  const start = () => {
    setPuzzles(buildDua4Puzzles());
    setIdx(0);
    setTokens([]);
    setScore(0);
    setSolved(0);
    setSkipped(0);
    setNote("");
    setIsRecord(false);
    setTimeLeft(DUA4_SECONDS);
    startRef.current = nowMs();
    puzzleStart.current = nowMs();
    setPhase("play");
  };

  useInterval(
    () => {
      const left = DUA4_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setIsRecord(submit(score));
        setPhase("result");
      } else setTimeLeft(left);
    },
    phase === "play" ? 200 : null,
  );

  const advance = () => {
    setTokens([]);
    puzzleStart.current = nowMs();
    if (idx + 1 >= puzzles.length) {
      setPuzzles(buildDua4Puzzles());
      setIdx(0);
    } else setIdx(idx + 1);
  };

  const addNum = (slot: number) => {
    if (phase === "play" && !used.has(slot)) setTokens([...tokens, { text: String(nums[slot]), slot }]);
  };
  const addOp = (text: string) => {
    if (phase === "play") setTokens([...tokens, { text }]);
  };
  const back = () => setTokens(tokens.slice(0, -1));

  const check = () => {
    if (phase !== "play") return;
    const bad = (msg: string) => {
      setNote(msg);
      setShake(true);
      setTimeout(() => setShake(false), 300);
    };
    if (used.size !== 4) return bad("Pakai keempat angka tepat satu kali.");
    const value = evalExpr(tokens.map((t) => t.text));
    if (value === null) return bad("Ekspresi tidak valid.");
    if (Math.abs(value - 24) > 1e-6) return bad(`Hasilnya ${Number.isInteger(value) ? value : value.toFixed(2)}, bukan 24.`);
    const sec = (nowMs() - puzzleStart.current) / 1000;
    const pts = 150 + Math.round(Math.max(0, 1 - sec / SPEED_WINDOW_S) * 100);
    setScore((s) => s + pts);
    setSolved((n) => n + 1);
    setNote(`✅ Tepat 24! +${pts}`);
    advance();
  };

  const skip = () => {
    if (phase !== "play") return;
    setSkipped((n) => n + 1);
    setNote("Soal dilewati.");
    advance();
  };

  useEffect(() => {
    keyRef.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) {
        const slot = nums.findIndex((n, i) => String(n) === e.key && !used.has(i));
        if (slot >= 0) addNum(slot);
      } else if ("+-*/()".includes(e.key) && e.key.length === 1) addOp(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") check();
      else return;
      e.preventDefault();
    };
  });

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "start") return <StartCard game="dua4" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="dua4"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${solved} soal terjawab · ${skipped} dilewati`}
        onAgain={start}
      />
    );
  }

  const btn = "rounded-xl border border-slate-200 bg-white py-3 text-lg font-black text-slate-700 shadow-sm transition active:scale-90 hover:bg-slate-50";

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Terjawab {solved}</span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 20 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <div className={`rounded-2xl border-2 bg-white px-4 py-4 text-center transition-colors ${shake ? "border-red-400" : "border-slate-200"}`}>
        <p className="text-xs font-bold text-slate-400">Buat tepat 24 dengan keempat angka ini</p>
        <p className="mt-1 min-h-10 break-all font-mono text-3xl font-black tracking-wider text-slate-900">
          {tokens.length === 0 ? "…" : tokens.map((t) => OPS.find((o) => o.text === t.text)?.label ?? t.text).join(" ")}
        </p>
      </div>
      <p className="mt-1.5 min-h-5 text-center text-xs font-bold text-slate-500">{note}</p>

      <div className="mt-1 grid grid-cols-4 gap-2">
        {nums.map((n, slot) => (
          <button
            key={slot}
            type="button"
            disabled={used.has(slot)}
            onClick={() => addNum(slot)}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 py-4 text-3xl font-black text-white shadow-md transition active:scale-90 disabled:opacity-25"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-6 gap-2">
        {OPS.map((o) => (
          <button key={o.text} type="button" onClick={() => addOp(o.text)} className={btn}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={back} disabled={tokens.length === 0} className={`${btn} text-sm disabled:opacity-40`}>
          ⌫ Hapus
        </button>
        <button type="button" onClick={skip} className={`${btn} text-sm`}>
          Lewati ⏭
        </button>
        <button type="button" onClick={check} className="rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow transition active:scale-95">
          Cek ✔
        </button>
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400">Keyboard: angka, + − * / ( ), Backspace, Enter</p>
    </div>
  );
}
