"use client";

// =====================================================
// PrioritySortGame — Susun Prioritas
//
// 8 ronde: 5 tiket diacak, tap dari prioritas tertinggi (Critical) ke
// terendah (Low). Benar = +50 + bonus kecepatan. Salah = -20 dan satu
// nyawa hilang. 3 nyawa — habis = game over.
// =====================================================

import { useRef, useState } from "react";
import {
  PRIORITY_DOT,
  PRIORITY_ORDER,
  SORT_ROUNDS,
  buildSortRounds,
  canPlaySort,
  type GameTicket,
  type SortRound,
} from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useDelay, useInterval } from "./GameParts";

const ROUND_SECONDS = 20;
const FEEDBACK_MS = 600;

type Phase = "start" | "play" | "result";

export function PrioritySortGame({
  tickets,
  userId,
}: {
  tickets: GameTicket[];
  userId?: string;
}) {
  const { best, submit } = useBest(userId, "priority_sort");
  const delay = useDelay();

  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<SortRound[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [tapOrder, setTapOrder] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [flash, setFlash] = useState<Record<number, "ok" | "bad">>({});
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const [rightTotal, setRightTotal] = useState(0);
  const [wrongTotal, setWrongTotal] = useState(0);
  const endRef = useRef(0);

  const armTimer = () => {
    endRef.current = Date.now() + ROUND_SECONDS * 1000;
    setTimeLeft(ROUND_SECONDS);
  };

  const start = () => {
    setRounds(buildSortRounds(tickets));
    setRoundIdx(0);
    setTapOrder([]);
    setScore(0);
    setCombo(0);
    setLives(3);
    setFlash({});
    setIsRecord(false);
    setRightTotal(0);
    setWrongTotal(0);
    armTimer();
    setPhase("play");
  };

  const finishGame = (finalScore: number) => {
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const nextRound = (newScore: number) => {
    if (roundIdx + 1 >= rounds.length) {
      finishGame(newScore);
    } else {
      delay(() => {
        setRoundIdx((r) => r + 1);
        setTapOrder([]);
        setFlash({});
        armTimer();
      }, FEEDBACK_MS);
    }
  };

  const tap = (idx: number) => {
    if (phase !== "play") return;
    const round = rounds[roundIdx];
    if (!round || tapOrder.includes(idx)) return;

    const expectedPos = tapOrder.length;
    const expectedIdx = round.correctOrder[expectedPos];
    const ok = idx === expectedIdx;

    const newTapOrder = [...tapOrder, idx];
    setTapOrder(newTapOrder);

    if (ok) {
      const gained = 50 + Math.round(timeLeft * 2) + Math.min(combo, 5) * 10;
      const newScore = score + gained;
      setScore(newScore);
      setCombo((c) => c + 1);
      setRightTotal((r) => r + 1);
      setFlash((f) => ({ ...f, [idx]: "ok" }));

      // All 5 tapped correctly → next round
      if (newTapOrder.length >= round.tickets.length) {
        nextRound(newScore);
      }
    } else {
      const newScore = Math.max(0, score - 20);
      const newLives = lives - 1;
      setScore(newScore);
      setCombo(0);
      setLives(newLives);
      setWrongTotal((w) => w + 1);
      setFlash((f) => ({ ...f, [idx]: "bad" }));

      if (newLives <= 0) {
        delay(() => finishGame(newScore), FEEDBACK_MS);
      } else {
        // Remove the wrong tap after feedback so player can retry
        delay(() => {
          setTapOrder((prev) => prev.filter((i) => i !== idx));
          setFlash((f) => {
            const next = { ...f };
            delete next[idx];
            return next;
          });
        }, FEEDBACK_MS);
      }
    }
  };

  // Timer: skip round if time runs out
  useInterval(
    () => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setLives((l) => {
          const newLives = l - 1;
          if (newLives <= 0) {
            delay(() => finishGame(score), 300);
          } else {
            nextRound(score);
          }
          return newLives;
        });
      } else {
        setTimeLeft(left);
      }
    },
    phase === "play" ? 100 : null,
  );

  if (phase === "start") {
    return (
      <StartCard
        game="priority_sort"
        best={best}
        onStart={start}
        blocked={!canPlaySort(tickets)}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultCard
        game="priority_sort"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${rightTotal} benar · ${wrongTotal} salah · ${roundIdx + 1} ronde`}
        onAgain={start}
      />
    );
  }

  const round = rounds[roundIdx];
  if (!round) return null;

  const priorityLabel: Record<string, string> = {
    critical: "Critical",
    high: "High",
    normal: "Normal",
    low: "Low",
  };

  return (
    <div className="max-w-xl mx-auto">
      <Hud
        score={score}
        combo={combo}
        fraction={timeLeft / ROUND_SECONDS}
        label={`${Math.ceil(timeLeft)}s`}
      />

      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-slate-500 font-semibold">
          Ronde {roundIdx + 1}/{SORT_ROUNDS}
        </span>
        <span className="flex gap-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`text-lg transition-all ${
                i < lives ? "opacity-100 scale-100" : "opacity-20 scale-75"
              }`}
            >
              ❤️
            </span>
          ))}
        </span>
      </div>

      <p className="text-center text-sm font-bold text-slate-600 mb-3">
        Tap dari prioritas <span className="text-red-500">TERTINGGI</span> ke{" "}
        <span className="text-slate-400">terendah</span>
      </p>

      <div className="space-y-2">
        {round.tickets.map((t, i) => {
          const tapped = tapOrder.includes(i);
          const flashState = flash[i];
          const order = tapOrder.indexOf(i);

          let bg = "bg-white border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 active:scale-[0.98]";
          if (flashState === "ok") bg = "bg-emerald-100 border-emerald-400 scale-[0.97]";
          else if (flashState === "bad") bg = "bg-red-100 border-red-400 animate-pulse";
          else if (tapped) bg = "bg-slate-50 border-slate-100 opacity-40";

          return (
            <button
              key={`${t.id}-${i}`}
              type="button"
              disabled={tapped && !flashState}
              onClick={() => tap(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${bg}`}
            >
              {tapped && flashState !== "bad" && (
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {order + 1}
                </span>
              )}
              <span className="text-lg flex-shrink-0">
                {PRIORITY_DOT[t.priority]}
              </span>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-xs font-mono text-indigo-500 font-semibold">
                  {t.ticket_id}
                </span>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {t.subject}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  t.priority === "critical"
                    ? "bg-red-100 text-red-700"
                    : t.priority === "high"
                      ? "bg-orange-100 text-orange-700"
                      : t.priority === "normal"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {priorityLabel[t.priority]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
