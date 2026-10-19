"use client";

// =====================================================
// SpeedTypeGame — Ketik Cepat
//
// 45 detik: tiket muncul satu per satu, ketik ID tiketnya (misal
// MST-042) sebelum timer habis. Case-insensitive. Benar = +80 +
// bonus kecepatan. Makin lama, makin cepat timer per tiketnya.
// =====================================================

import { useEffect, useRef, useState } from "react";
import {
  PRIORITY_DOT,
  SPEED_TYPE_DURATION,
  buildTypeQueue,
  canPlaySpeedType,
  type GameTicket,
} from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

const ITEM_BASE_SECONDS = 8;
const ITEM_MIN_SECONDS = 3;

type Phase = "start" | "play" | "result";

export function SpeedTypeGame({
  tickets,
  userId,
}: {
  tickets: GameTicket[];
  userId?: string;
}) {
  const { best, submit } = useBest(userId, "speed_type");
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("start");
  const [queue, setQueue] = useState<GameTicket[]>([]);
  const [pos, setPos] = useState(0);
  const [input, setInput] = useState("");
  const [globalTimeLeft, setGlobalTimeLeft] = useState(SPEED_TYPE_DURATION);
  const [itemTimeLeft, setItemTimeLeft] = useState(ITEM_BASE_SECONDS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [typed, setTyped] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [flash, setFlash] = useState<"ok" | "skip" | null>(null);
  const [isRecord, setIsRecord] = useState(false);
  const globalEndRef = useRef(0);
  const itemEndRef = useRef(0);

  const itemSeconds = () => Math.max(ITEM_MIN_SECONDS, ITEM_BASE_SECONDS - Math.floor(typed / 3) * 0.5);

  const armItemTimer = () => {
    const sec = itemSeconds();
    itemEndRef.current = Date.now() + sec * 1000;
    setItemTimeLeft(sec);
  };

  const start = () => {
    setQueue(buildTypeQueue(tickets));
    setPos(0);
    setInput("");
    setScore(0);
    setCombo(0);
    setTyped(0);
    setSkipped(0);
    setFlash(null);
    setIsRecord(false);
    setGlobalTimeLeft(SPEED_TYPE_DURATION);
    globalEndRef.current = Date.now() + SPEED_TYPE_DURATION * 1000;
    armItemTimer();
    setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishGame = (finalScore: number) => {
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const advance = (ok: boolean, currentScore: number) => {
    if (ok) {
      setFlash("ok");
    } else {
      setFlash("skip");
    }
    setTimeout(() => setFlash(null), 350);
    setPos((p) => p + 1);
    setInput("");
    armItemTimer();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    if (phase !== "play") return;
    const t = queue[pos];
    if (!t) return;

    const trimmed = input.trim();
    if (!trimmed) return;

    const ok = trimmed.toLowerCase() === t.ticket_id.toLowerCase();

    if (ok) {
      const gained = 80 + Math.round(itemTimeLeft * 10) + Math.min(combo, 10) * 8;
      const newScore = score + gained;
      setScore(newScore);
      setCombo((c) => c + 1);
      setTyped((n) => n + 1);
      advance(true, newScore);
    } else {
      // Typo — skip, no penalty
      setCombo(0);
      setSkipped((s) => s + 1);
      advance(false, score);
    }
  };

  // Focus on input when switching to play
  useEffect(() => {
    if (phase === "play") inputRef.current?.focus();
  }, [phase, pos]);

  // Keyboard: Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  useInterval(
    () => {
      const now = Date.now();
      // Global timer
      const gLeft = (globalEndRef.current - now) / 1000;
      if (gLeft <= 0) {
        setGlobalTimeLeft(0);
        finishGame(score);
        return;
      }
      setGlobalTimeLeft(gLeft);

      // Item timer
      const iLeft = (itemEndRef.current - now) / 1000;
      if (iLeft <= 0) {
        setItemTimeLeft(0);
        setCombo(0);
        setSkipped((s) => s + 1);
        advance(false, score);
      } else {
        setItemTimeLeft(iLeft);
      }
    },
    phase === "play" ? 100 : null,
  );

  if (phase === "start") {
    return (
      <StartCard
        game="speed_type"
        best={best}
        onStart={start}
        blocked={!canPlaySpeedType(tickets)}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultCard
        game="speed_type"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${typed} benar · ${skipped} skip/salah`}
        onAgain={start}
      />
    );
  }

  const t = queue[pos];
  if (!t) return null;

  const maxItemSec = itemSeconds();

  return (
    <div className="max-w-xl mx-auto">
      <Hud
        score={score}
        combo={combo}
        fraction={globalTimeLeft / SPEED_TYPE_DURATION}
        label={`${Math.ceil(globalTimeLeft)}s`}
      />

      {/* Item timer bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-bold mb-1">
          <span className="text-slate-500">Waktu per tiket</span>
          <span className={itemTimeLeft < 2 ? "text-red-500 animate-pulse" : "text-slate-400"}>
            {Math.ceil(itemTimeLeft)}s
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              itemTimeLeft / maxItemSec < 0.25
                ? "bg-red-500"
                : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
            style={{ width: `${Math.max(0, (itemTimeLeft / maxItemSec) * 100)}%` }}
          />
        </div>
      </div>

      {/* Ticket card */}
      <div
        className={`rounded-2xl border shadow-sm p-5 text-center transition-colors duration-150 ${
          flash === "ok"
            ? "bg-emerald-50 border-emerald-300"
            : flash === "skip"
              ? "bg-amber-50 border-amber-300"
              : "bg-white border-slate-200"
        }`}
      >
        <span className="font-mono text-xs font-semibold text-indigo-500">
          {PRIORITY_DOT[t.priority]} Tiket #{pos + 1}
        </span>
        <h3 className="mt-2 text-lg font-bold text-slate-900 leading-snug min-h-[3.2rem]">
          {t.subject}
        </h3>
        {t.productName && (
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
            {t.productName}
          </span>
        )}

        <div className="mt-4 bg-slate-900 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-2 font-semibold">
            Ketik ID tiket ini ↓
          </p>
          <div className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 select-none blur-[6px] hover:blur-none transition-all duration-300">
            {t.ticket_id}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            (hover untuk intip 👀)
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Ketik ID, misal MST-042"
          className="flex-1 px-4 py-3 text-lg font-mono font-bold text-center border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors bg-white"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="px-5 py-3 rounded-xl text-white font-black bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg hover:opacity-90 active:scale-95 transition"
        >
          ↵
        </button>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
        <span>✅ {typed} benar</span>
        <span>⏭️ {skipped} skip</span>
      </div>
    </div>
  );
}
