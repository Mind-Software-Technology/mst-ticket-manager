"use client";

// =====================================================
// MundurGame — Urutan Mundur (solo)
//
// 8 ronde. Hafalkan urutan hewan, lalu tap dari yang TERAKHIR ke yang
// pertama. Tiap benar +10, ronde beres +20. Salah tap = ronde berakhir.
// =====================================================

import { useRef, useState } from "react";
import { buildMundurRounds, type MundurRound } from "@/lib/mp-content";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "show" | "input" | "feedback" | "result";

export function MundurGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "mundur");

  const [phase, setPhase] = useState<Phase>("start");
  const [rounds, setRounds] = useState<MundurRound[]>([]);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(0);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [ok, setOk] = useState(true);
  const [isRecord, setIsRecord] = useState(false);
  const tickRef = useRef(0);

  const finish = (finalScore: number) => {
    setScore(finalScore);
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const beginRound = (r: number) => {
    setRound(r);
    setShown(0);
    setStep(0);
    tickRef.current = 0;
    setPhase("show");
  };

  const start = () => {
    setRounds(buildMundurRounds());
    setScore(0);
    setPerfect(0);
    setIsRecord(false);
    beginRound(0);
  };

  useInterval(
    () => {
      if (phase === "show") {
        const len = rounds[round][0].length;
        if (shown < len) setShown((n) => n + 1);
        else {
          tickRef.current += 1;
          if (tickRef.current >= 1) setPhase("input");
        }
        return;
      }
      if (phase === "feedback") {
        if (round + 1 >= rounds.length) finish(score);
        else beginRound(round + 1);
      }
    },
    phase === "show" ? 700 : phase === "feedback" ? 1100 : null,
  );

  const pick = (emoji: string) => {
    const seq = rounds[round][0];
    const want = seq[seq.length - 1 - step];
    if (emoji !== want) {
      setOk(false);
      setPhase("feedback");
      return;
    }
    const gained = 10 + (step + 1 === seq.length ? 20 : 0);
    setScore((s) => s + gained);
    if (step + 1 === seq.length) {
      setPerfect((p) => p + 1);
      setOk(true);
      setPhase("feedback");
    } else setStep(step + 1);
  };

  if (phase === "start") return <StartCard game="mundur" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return <ResultCard game="mundur" score={score} best={best} isRecord={isRecord} stats={`${perfect}/${rounds.length} ronde sempurna`} onAgain={start} />;
  }

  const [seq, pool] = rounds[round];
  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
        <span>
          Ronde {round + 1}/{rounds.length}
        </span>
        <span className="text-indigo-600">Skor {score}</span>
      </div>
      <div className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 p-3 text-4xl">
        {phase === "show" &&
          seq.slice(0, shown).map((e, i) => <span key={i} className="animate-lb-pop">{e}</span>)}
        {phase === "input" &&
          seq.map((_, i) => (
            <span key={i} className={i < step ? "" : "opacity-30"}>
              {i < step ? seq[seq.length - 1 - i] : "❔"}
            </span>
          ))}
        {phase === "feedback" && (
          <span className="text-2xl font-black">{ok ? "Sempurna! 🎉" : `Salah 😅 (${[...seq].reverse().join(" ")})`}</span>
        )}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">
        {phase === "show" ? "Hafalkan urutannya…" : phase === "input" ? "Tap dari yang TERAKHIR!" : ""}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {pool.map((e) => (
          <button
            key={e}
            type="button"
            disabled={phase !== "input"}
            onPointerDown={() => pick(e)}
            className="py-3 rounded-xl bg-white border border-slate-200 text-3xl active:scale-90 disabled:opacity-50"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
