"use client";

// =====================================================
// SandiGame — Sandi Rahasia (solo, gaya Mastermind)
//
// 3 sandi 4 warna, 180 detik total, maks 10 tebakan per sandi.
// ● = warna & posisi pas, ○ = warna ada tapi posisi salah.
// =====================================================

import { useRef, useState } from "react";
import {
  SANDI_CODES,
  SANDI_COLORS,
  SANDI_LEN,
  SANDI_MAX_TRIES,
  SANDI_SECONDS,
  buildSandiCodes,
  sandiPoints,
  scoreSandi,
} from "@/lib/mp-content";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
interface Guess {
  g: number[];
  exact: number;
  partial: number;
}

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export function SandiGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "sandi");

  const [phase, setPhase] = useState<Phase>("start");
  const [codes, setCodes] = useState<number[][]>([]);
  const [codeIdx, setCodeIdx] = useState(0);
  const [current, setCurrent] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [score, setScore] = useState(0);
  const [cracked, setCracked] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SANDI_SECONDS);
  const [note, setNote] = useState("");
  const [isRecord, setIsRecord] = useState(false);

  const startRef = useRef(0);

  const start = () => {
    setCodes(buildSandiCodes());
    setCodeIdx(0);
    setCurrent([]);
    setGuesses([]);
    setScore(0);
    setCracked(0);
    setNote("");
    setIsRecord(false);
    setTimeLeft(SANDI_SECONDS);
    startRef.current = nowMs();
    setPhase("play");
  };

  const end = (final: number) => {
    setIsRecord(submit(final));
    setPhase("result");
  };

  useInterval(
    () => {
      const left = SANDI_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        end(score);
      } else setTimeLeft(left);
    },
    phase === "play" ? 200 : null,
  );

  const nextCode = (gain: number, msg: string) => {
    const total = score + gain;
    setScore(total);
    setNote(msg);
    setCurrent([]);
    setGuesses([]);
    if (codeIdx + 1 >= SANDI_CODES) end(total);
    else setCodeIdx(codeIdx + 1);
  };

  const add = (c: number) => {
    if (phase === "play" && current.length < SANDI_LEN) setCurrent([...current, c]);
  };

  const guess = () => {
    const code = codes[codeIdx];
    if (phase !== "play" || !code || current.length !== SANDI_LEN) return;
    const fb = scoreSandi(code, current);
    const tries = guesses.length + 1;
    if (fb.exact === SANDI_LEN) {
      const secondsLeft = SANDI_SECONDS - (nowMs() - startRef.current) / 1000;
      const pts = sandiPoints(tries, secondsLeft);
      setCracked((n) => n + 1);
      nextCode(pts, `🎉 Sandi terpecahkan dalam ${tries} tebakan! +${pts}`);
    } else if (tries >= SANDI_MAX_TRIES) {
      nextCode(0, `😵 Gagal! Sandinya: ${code.map((c) => SANDI_COLORS[c]).join(" ")}`);
    } else {
      setGuesses([...guesses, { g: current, ...fb }]);
      setCurrent([]);
      setNote("");
    }
  };

  if (phase === "start") return <StartCard game="sandi" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="sandi"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${cracked}/${SANDI_CODES} sandi terpecahkan`}
        onAgain={start}
      />
    );
  }

  const slots = Array.from({ length: SANDI_LEN }, (_, i) => current[i]);

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Sandi {codeIdx + 1}/{SANDI_CODES} · tebakan {guesses.length + 1}/{SANDI_MAX_TRIES}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 30 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      {note && <p className="mb-2 rounded-lg bg-slate-100 px-3 py-1.5 text-center text-xs font-bold text-slate-600">{note}</p>}

      <div className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
        {guesses.length === 0 && <p className="py-3 text-center text-xs text-slate-400">Belum ada tebakan. Mulai dari tebakan pertamamu!</p>}
        {guesses.map((gs, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5">
            <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
            <span className="flex-1 text-xl tracking-wider">{gs.g.map((c) => SANDI_COLORS[c]).join(" ")}</span>
            <span className="text-sm font-black text-slate-700">
              {"●".repeat(gs.exact)}
              <span className="text-slate-400">{"○".repeat(gs.partial)}</span>
              {gs.exact + gs.partial === 0 && <span className="text-xs text-slate-300">kosong</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {slots.map((c, i) => (
          <div
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl ${
              c === undefined ? "border-dashed border-slate-300 bg-white" : "border-indigo-300 bg-indigo-50"
            }`}
          >
            {c === undefined ? "" : SANDI_COLORS[c]}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2">
        {SANDI_COLORS.map((emoji, c) => (
          <button
            key={emoji}
            type="button"
            onClick={() => add(c)}
            className="aspect-square rounded-xl border border-slate-200 bg-white text-2xl shadow-sm transition active:scale-90 hover:bg-slate-50"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setCurrent(current.slice(0, -1))}
          disabled={current.length === 0}
          className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          ⌫ Hapus
        </button>
        <button
          type="button"
          onClick={guess}
          disabled={current.length !== SANDI_LEN}
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-2.5 text-sm font-black text-white shadow disabled:opacity-40"
        >
          Tebak ✔
        </button>
      </div>
    </div>
  );
}
