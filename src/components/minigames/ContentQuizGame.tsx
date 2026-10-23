"use client";

// =====================================================
// ContentQuizGame — Hitung Kilat / Trivia Seru / Acak Kata (solo)
//
// Soal pilihan ganda dari konten umum (bukan tiket). Benar = 100 +
// bonus kecepatan + kombo. Salah/telat = kombo hangus.
// =====================================================

import { useRef, useState } from "react";
import { buildMathQuestions, buildScrambleQuestions, buildTriviaQuestions, type ContentQuestion } from "@/lib/mp-content";
import { kindTitle } from "@/lib/multiplayer";
import type { GameKey } from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useDelay, useInterval } from "./GameParts";

type QuizKey = Extract<GameKey, "hitung" | "trivia" | "kata">;
type Phase = "start" | "play" | "result";

const QUESTION_SECONDS = 15;
const FEEDBACK_MS = 1100;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

const BUILDERS: Record<QuizKey, () => ContentQuestion[]> = {
  hitung: () => buildMathQuestions(12),
  trivia: () => buildTriviaQuestions(10),
  kata: () => buildScrambleQuestions(10),
};

export function ContentQuizGame({ game, userId }: { game: QuizKey; userId?: string }) {
  const { best, submit } = useBest(userId, game);
  const delay = useDelay();

  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<ContentQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const armTimer = () => {
    endRef.current = nowMs() + QUESTION_SECONDS * 1000;
    setTimeLeft(QUESTION_SECONDS);
  };

  const start = () => {
    setQuestions(BUILDERS[game]());
    setIdx(0);
    setPicked(null);
    setScore(0);
    setCombo(0);
    setCorrect(0);
    setIsRecord(false);
    armTimer();
    setPhase("play");
  };

  /** choice = indeks pilihan; -1 = waktu habis. */
  const answer = (choice: number) => {
    const q = questions[idx];
    if (!q || picked !== null) return;
    const ok = choice === q.answer;
    const gained = ok ? 100 + Math.round(timeLeft * 8) + Math.min(combo, 5) * 25 : 0;
    const newScore = score + gained;

    setPicked(choice);
    setScore(newScore);
    setCombo(ok ? combo + 1 : 0);
    if (ok) setCorrect((c) => c + 1);

    delay(() => {
      if (idx + 1 >= questions.length) {
        setIsRecord(submit(newScore));
        setPhase("result");
      } else {
        setIdx(idx + 1);
        setPicked(null);
        armTimer();
      }
    }, FEEDBACK_MS);
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        answer(-1);
      } else setTimeLeft(left);
    },
    phase === "play" && picked === null ? 100 : null,
  );

  if (phase === "start") return <StartCard game={game} best={best} onStart={start} blocked={false} />;

  if (phase === "result") {
    return (
      <ResultCard
        game={game}
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${correct} dari ${questions.length} soal benar`}
        onAgain={start}
      />
    );
  }

  const q = questions[idx];
  if (!q) return null;

  return (
    <div className="max-w-xl mx-auto">
      <Hud score={score} combo={combo} fraction={timeLeft / QUESTION_SECONDS} label={`${Math.ceil(timeLeft)}s`} />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-center">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Soal {idx + 1}/{questions.length}
          </span>
          <span className="font-semibold text-indigo-500">{kindTitle(q.kind)}</span>
        </div>
        <h3 className={`mt-3 font-black text-slate-900 leading-snug ${q.kind === "emoji" || q.kind === "scramble" ? "text-4xl tracking-widest" : "text-2xl"}`}>
          {q.prompt}
        </h3>
        <p className="mt-2 text-[11px] text-slate-400">{q.hint}</p>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {q.options.map((opt, i) => {
          const answered = picked !== null;
          const tone = !answered
            ? "bg-white border-slate-200 text-slate-800 hover:bg-purple-50 hover:border-purple-300 active:scale-[0.98]"
            : i === q.answer
              ? "bg-emerald-500 border-emerald-500 text-white"
              : i === picked
                ? "bg-red-500 border-red-500 text-white"
                : "bg-white border-slate-200 text-slate-400 opacity-60";
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => answer(i)}
              className={`px-4 py-3 rounded-xl border font-bold text-sm transition ${tone}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <p className="mt-3 text-center text-sm font-semibold text-slate-600">
          {picked === q.answer ? "✅ Benar!" : picked === -1 ? `⏰ Waktu habis! Jawabannya ${q.options[q.answer]}.` : `🙈 Ups, harusnya ${q.options[q.answer]}.`}
        </p>
      )}
    </div>
  );
}
