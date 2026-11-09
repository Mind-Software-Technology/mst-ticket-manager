"use client";

// =====================================================
// DominanGame — Warna Dominan (solo)
//
// 40 detik. Kumpulan titik berwarna tampil; tap warna yang jumlahnya
// paling banyak. Benar +10 (+bonus kombo), salah -5. Makin lama titik
// makin banyak dan selisihnya makin tipis.
// =====================================================

import { useRef, useState } from "react";
import { shuffle } from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const SECONDS = 40;
const COLORS = [
  { name: "merah", cls: "bg-red-500" },
  { name: "biru", cls: "bg-blue-500" },
  { name: "hijau", cls: "bg-emerald-500" },
  { name: "kuning", cls: "bg-yellow-400" },
];

interface Round {
  dots: number[]; // indeks warna per titik
  answer: number;
}

function buildRound(level: number): Round {
  const kinds = level < 3 ? 3 : 4;
  const gap = Math.max(1, 4 - Math.floor(level / 3));
  const base = 4 + Math.min(level, 8);
  const counts = Array.from({ length: kinds }, () => base + Math.floor(Math.random() * 3));
  const winner = Math.floor(Math.random() * kinds);
  const top = Math.max(...counts);
  counts[winner] = top + gap;
  // pastikan pemenang tunggal
  const dots = shuffle(counts.flatMap((c, i) => Array<number>(c).fill(i)));
  return { dots, answer: winner };
}

export function DominanGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "dominan");

  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState<Round>({ dots: [], answer: 0 });
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const finish = (finalScore: number) => {
    setIsRecord(submit(finalScore));
    setPhase("result");
  };

  const start = () => {
    setLevel(0);
    setRound(buildRound(0));
    setScore(0);
    setCombo(0);
    setRight(0);
    setWrongCount(0);
    setIsRecord(false);
    setTimeLeft(SECONDS);
    endRef.current = Date.now() + SECONDS * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const pick = (i: number) => {
    if (i === round.answer) {
      const nc = combo + 1;
      setScore((s) => s + 10 + (nc % 5 === 0 ? 10 : 0));
      setCombo(nc);
      setRight((r) => r + 1);
      const nl = level + 1;
      setLevel(nl);
      setRound(buildRound(nl));
    } else {
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setWrongCount((w) => w + 1);
      setRound(buildRound(level));
    }
  };

  if (phase === "start") return <StartCard game="dominan" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="dominan"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${right} benar · ${wrongCount} salah`}
        onAgain={start}
      />
    );
  }

  const kinds = new Set(round.dots).size;

  return (
    <div className="max-w-sm mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-sm font-bold text-slate-500">Warna mana yang paling banyak?</p>
      <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 min-h-[9rem]">
        {round.dots.map((c, i) => (
          <span key={i} className={`h-6 w-6 rounded-full ${COLORS[c].cls}`} />
        ))}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${kinds}, minmax(0, 1fr))` }}>
        {COLORS.slice(0, kinds).map((c, i) => (
          <button
            key={c.name}
            type="button"
            onPointerDown={() => pick(i)}
            className={`h-14 rounded-xl ${c.cls} text-sm font-black text-white shadow active:scale-95 transition`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
