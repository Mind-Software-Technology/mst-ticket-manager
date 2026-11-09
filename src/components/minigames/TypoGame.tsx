"use client";

// =====================================================
// TypoGame — Cari Typo (solo)
//
// 40 detik. Empat kata tampil, satu di antaranya salah ketik. Tap kata
// yang typo. Benar +10 (bonus tiap 5 kombo), salah -5 dan kombo hangus.
// Makin lama kata makin panjang dan typo makin halus.
// =====================================================

import { useRef, useState } from "react";
import { shuffle } from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";
const SECONDS = 40;

const SHORT = ["tiket", "sprint", "deploy", "server", "backup", "report", "klien", "tugas", "revisi", "jadwal", "proyek", "bug"];
const LONG = [
  "deadline", "database", "developer", "meeting", "prioritas", "dokumentasi", "integrasi", "validasi",
  "migrasi", "notifikasi", "repository", "komponen", "otorisasi", "monitoring", "performa", "implementasi",
];

/** Buat typo: tukar dua huruf bersebelahan yang berbeda, atau hapus satu huruf. */
function makeTypo(word: string): string {
  const chars = word.split("");
  const idxs = shuffle(Array.from({ length: chars.length - 1 }, (_, i) => i + 1));
  if (Math.random() < 0.6) {
    for (const i of idxs) {
      if (chars[i] !== chars[i - 1] && i < chars.length - 1 + 1) {
        const c = [...chars];
        [c[i - 1], c[i]] = [c[i], c[i - 1]];
        const out = c.join("");
        if (out !== word) return out;
      }
    }
  }
  const drop = idxs[0] ?? 1;
  return chars.filter((_, i) => i !== drop).join("");
}

interface Round {
  words: string[];
  bad: number;
}

function buildRound(level: number): Round {
  const pool = level < 4 ? SHORT : [...SHORT, ...LONG];
  const four = shuffle(pool).slice(0, 4);
  const bad = Math.floor(Math.random() * 4);
  const words = four.map((w, i) => (i === bad ? makeTypo(w) : w));
  return { words, bad };
}

export function TypoGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "typo");

  const [phase, setPhase] = useState<Phase>("start");
  const [round, setRound] = useState<Round>({ words: [], bad: 0 });
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
    const nl = level + 1;
    if (i === round.bad) {
      const nc = combo + 1;
      setScore((s) => s + 10 + (nc % 5 === 0 ? 10 : 0));
      setCombo(nc);
      setRight((r) => r + 1);
    } else {
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setWrongCount((w) => w + 1);
    }
    setLevel(nl);
    setRound(buildRound(nl));
  };

  if (phase === "start") return <StartCard game="typo" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="typo"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${right} benar · ${wrongCount} salah`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <p className="mb-2 text-center text-sm font-bold text-slate-500">Mana kata yang salah ketik?</p>
      <div className="grid grid-cols-2 gap-2">
        {round.words.map((w, i) => (
          <button
            key={`${level}-${i}`}
            type="button"
            onPointerDown={() => pick(i)}
            className="h-16 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-800 shadow-sm active:scale-95 transition"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
