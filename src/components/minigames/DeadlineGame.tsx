"use client";

// =====================================================
// DeadlineGame — Telat atau Aman?
//
// Adu refleks 30 detik: tiket aktif muncul satu-satu, tebak apakah
// deadline-nya sudah lewat (TELAT) atau belum (AMAN). Deadline = hari
// ini dianggap AMAN. Keyboard: ← TELAT, → AMAN.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { toISODate } from "@/lib/date-utils";
import { PRIORITY_DOT, deadlinePool, shuffle, type GameTicket } from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useDelay, useInterval } from "./GameParts";

const DURATION = 30;
const MIN_POOL = 5;
const QUEUE_SIZE = 200;

type Phase = "start" | "play" | "result";

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export function DeadlineGame({ tickets, userId }: { tickets: GameTicket[]; userId?: string }) {
  const { best, submit } = useBest(userId, "deadline");
  const delay = useDelay();
  const pool = deadlinePool(tickets);

  const [phase, setPhase] = useState<Phase>("start");
  const [queue, setQueue] = useState<GameTicket[]>([]);
  const [pos, setPos] = useState(0);
  const [today, setToday] = useState("");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const start = () => {
    const repeats = Math.ceil(QUEUE_SIZE / pool.length);
    setQueue(Array.from({ length: repeats }, () => shuffle(pool)).flat());
    setPos(0);
    setToday(toISODate(new Date()));
    setScore(0);
    setCombo(0);
    setRight(0);
    setWrong(0);
    setFlash(null);
    setIsRecord(false);
    setTimeLeft(DURATION);
    endRef.current = Date.now() + DURATION * 1000;
    setPhase("play");
  };

  const answer = (saidLate: boolean) => {
    const t = queue[pos];
    if (!t?.due_date || phase !== "play") return;
    const isLate = t.due_date < today;
    const ok = saidLate === isLate;

    if (ok) {
      setScore((s) => s + 10 + Math.floor(combo / 5) * 5);
      setCombo((c) => c + 1);
      setRight((r) => r + 1);
    } else {
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setWrong((w) => w + 1);
    }
    setFlash(ok ? "ok" : "bad");
    delay(() => setFlash(null), 300);
    setPos((p) => p + 1);
  };

  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  });
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") answerRef.current(true);
      if (e.key === "ArrowRight") answerRef.current(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useInterval(
    () => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setIsRecord(submit(score));
        setPhase("result");
      } else {
        setTimeLeft(left);
      }
    },
    phase === "play" ? 100 : null,
  );

  if (phase === "start") {
    return <StartCard game="deadline" best={best} onStart={start} blocked={pool.length < MIN_POOL} />;
  }

  if (phase === "result") {
    return (
      <ResultCard
        game="deadline"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${right} benar · ${wrong} salah`}
        onAgain={start}
      />
    );
  }

  const t = queue[pos];
  if (!t || !t.due_date) return null;
  const diff = Math.round((new Date(`${t.due_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);

  return (
    <div className="max-w-xl mx-auto">
      <Hud score={score} combo={combo} fraction={timeLeft / DURATION} label={`${Math.ceil(timeLeft)}s`} />

      <p className="text-center text-xs font-semibold text-slate-400 mb-2">📅 Hari ini: {fmt(today)}</p>

      <div
        className={`rounded-2xl border shadow-sm p-5 text-center transition-colors duration-150 ${
          flash === "ok" ? "bg-emerald-50 border-emerald-300" : flash === "bad" ? "bg-red-50 border-red-300" : "bg-white border-slate-200"
        }`}
      >
        <span className="font-mono text-xs font-semibold text-indigo-500">
          {PRIORITY_DOT[t.priority]} {t.ticket_id}
        </span>
        <h3 className="mt-1 text-lg font-bold text-slate-900 leading-snug min-h-[3.2rem]">{t.subject}</h3>
        <p className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-900 text-white text-sm font-bold">
          Deadline: {fmt(t.due_date)}
        </p>
        <p className="mt-2 text-[11px] text-slate-300">{diff === 0 ? "(hari ini)" : ""}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => answer(true)}
          className="py-5 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-lg font-black shadow-lg active:scale-95 transition"
        >
          🐌 TELAT
          <span className="block text-[10px] font-semibold opacity-70">← keyboard</span>
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          className="py-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-lg font-black shadow-lg active:scale-95 transition"
        >
          ✅ AMAN
          <span className="block text-[10px] font-semibold opacity-70">keyboard →</span>
        </button>
      </div>
    </div>
  );
}
