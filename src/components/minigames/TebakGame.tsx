"use client";

// =====================================================
// TebakGame — Tebak Angka (solo)
//
// 3 ronde, angka rahasia 1-100, maks 7 tebakan per ronde.
// Benar = 100 + 50 per sisa tebakan. Gagal = 0 poin ronde itu.
// =====================================================

import { useState } from "react";
import { ResultCard, StartCard, useBest } from "./GameParts";

type Phase = "start" | "play" | "end";

const ROUNDS = 3;
const MAX_GUESSES = 7;

const randomSecret = () => 1 + Math.floor(Math.random() * 100);

export function TebakGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "tebak");

  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState(0);
  const [secret, setSecret] = useState(50);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  /** null = ronde berjalan, true = tebakan benar, false = kehabisan tebakan. */
  const [roundWon, setRoundWon] = useState<boolean | null>(null);
  const [isRecord, setIsRecord] = useState(false);

  const newRound = (i: number) => {
    setRound(i);
    setSecret(randomSecret());
    setGuesses([]);
    setInput("");
    setRoundWon(null);
  };

  const start = () => {
    setScore(0);
    setSolved(0);
    setIsRecord(false);
    newRound(0);
    setPhase("play");
  };

  const guess = () => {
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1 || n > 100 || roundWon !== null) return;
    const next = [...guesses, n];
    setGuesses(next);
    setInput("");
    if (n === secret) {
      setScore((s) => s + 100 + (MAX_GUESSES - next.length) * 50);
      setSolved((c) => c + 1);
      setRoundWon(true);
    } else if (next.length >= MAX_GUESSES) {
      setRoundWon(false);
    }
  };

  const advance = () => {
    if (round + 1 >= ROUNDS) {
      setIsRecord(submit(score));
      setPhase("end");
    } else newRound(round + 1);
  };

  if (phase === "start") return <StartCard game="tebak" best={best} onStart={start} blocked={false} />;
  if (phase === "end") {
    return (
      <ResultCard
        game="tebak"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${solved}/${ROUNDS} angka berhasil ditebak`}
        onAgain={start}
      />
    );
  }

  const left = MAX_GUESSES - guesses.length;
  const last = guesses[guesses.length - 1];

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Ronde {round + 1}/{ROUNDS}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 px-4 py-6 text-center">
        <div className="text-5xl">{roundWon === true ? "🎉" : roundWon === false ? "😵" : "🔮"}</div>
        <p className="mt-2 text-sm font-bold text-slate-500">
          {roundWon === true
            ? `Benar! Angkanya ${secret}.`
            : roundWon === false
              ? `Kehabisan tebakan. Angkanya ${secret}.`
              : last === undefined
                ? "Aku memikirkan angka 1-100…"
                : last > secret
                  ? `${last} terlalu BESAR ⬇️`
                  : `${last} terlalu KECIL ⬆️`}
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-label={`Sisa ${left} tebakan`}>
          {Array.from({ length: MAX_GUESSES }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < left ? "bg-indigo-500" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      {roundWon === null ? (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            guess();
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1 - 100"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-xl font-black text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 active:scale-95"
          >
            Tebak
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={advance}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 active:scale-95"
        >
          {round + 1 >= ROUNDS ? "Lihat Hasil 🏁" : "Ronde Berikutnya ➡️"}
        </button>
      )}

      {guesses.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {guesses.map((g, i) => (
            <span
              key={i}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                g === secret ? "bg-emerald-100 text-emerald-700" : g > secret ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              {g} {g === secret ? "✓" : g > secret ? "↓" : "↑"}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
