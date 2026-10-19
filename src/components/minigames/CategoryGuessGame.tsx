"use client";

// =====================================================
// CategoryGuessGame — Tebak Kategori
//
// 10 soal: lihat judul tiket, tebak kategorinya dari 4 pilihan.
// Benar = 100 + bonus kecepatan + kombo. Salah = kombo hangus.
// =====================================================

import { useRef, useState } from "react";
import {
  CATEGORY_ROUNDS,
  PRIORITY_DOT,
  buildCategoryQuiz,
  canPlayCategory,
  type CategoryQuestion,
  type GameTicket,
} from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useDelay, useInterval } from "./GameParts";

const QUESTION_SECONDS = 15;
const FEEDBACK_MS = 1100;

type Phase = "start" | "play" | "result";

export function CategoryGuessGame({
  tickets,
  userId,
}: {
  tickets: GameTicket[];
  userId?: string;
}) {
  const { best, submit } = useBest(userId, "category_guess");
  const delay = useDelay();

  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<CategoryQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const armTimer = () => {
    endRef.current = Date.now() + QUESTION_SECONDS * 1000;
    setTimeLeft(QUESTION_SECONDS);
  };

  const start = () => {
    setQuestions(buildCategoryQuiz(tickets));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setCombo(0);
    setCorrect(0);
    setIsRecord(false);
    armTimer();
    setPhase("play");
  };

  const answer = (choice: string | null) => {
    const q = questions[idx];
    if (!q || picked !== null) return;
    const ok = choice === q.answer;
    const gained = ok ? 100 + Math.round(timeLeft * 8) + Math.min(combo, 5) * 25 : 0;
    const newScore = score + gained;

    setPicked(choice ?? "");
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
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        answer(null);
      } else {
        setTimeLeft(left);
      }
    },
    phase === "play" && picked === null ? 100 : null,
  );

  if (phase === "start") {
    return (
      <StartCard
        game="category_guess"
        best={best}
        onStart={start}
        blocked={!canPlayCategory(tickets)}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultCard
        game="category_guess"
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
  const t = q.ticket;

  return (
    <div className="max-w-xl mx-auto">
      <Hud
        score={score}
        combo={combo}
        fraction={timeLeft / QUESTION_SECONDS}
        label={`${Math.ceil(timeLeft)}s`}
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Soal {idx + 1}/{Math.min(CATEGORY_ROUNDS, questions.length)}
          </span>
          <span className="font-mono font-semibold text-indigo-500">
            {t.ticket_id}
          </span>
        </div>

        <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug">
          {t.subject}
        </h3>

        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {PRIORITY_DOT[t.priority]} {t.priority}
          </span>
          {t.productName && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {t.productName}
            </span>
          )}
          {t.assigneeName && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              👤 {t.assigneeName}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-500">
          Tiket ini masuk kategori apa?
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {q.options.map((opt) => {
          const answered = picked !== null;
          const isAnswer = opt === q.answer;
          const isPicked = opt === picked;
          const tone = !answered
            ? "bg-white border-slate-200 text-slate-800 hover:bg-purple-50 hover:border-purple-300 active:scale-[0.98]"
            : isAnswer
              ? "bg-emerald-500 border-emerald-500 text-white"
              : isPicked
                ? "bg-red-500 border-red-500 text-white"
                : "bg-white border-slate-200 text-slate-400 opacity-60";
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => answer(opt)}
              className={`px-4 py-3 rounded-xl border font-bold text-sm transition ${tone}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <p className="mt-3 text-center text-sm font-semibold text-slate-600">
          {picked === q.answer
            ? "✅ Benar! Kamu hafal kategorinya."
            : picked === ""
              ? `⏰ Waktu habis! Kategorinya ${q.answer}.`
              : `🙈 Ups, harusnya ${q.answer}.`}
        </p>
      )}
    </div>
  );
}
