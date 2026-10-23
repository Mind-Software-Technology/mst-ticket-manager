"use client";

// =====================================================
// KetikGame — Ketik Kata (solo)
//
// 45 detik: ketik kata yang tampil. Otomatis lanjut begitu kata selesai
// diketik dengan benar. 10 poin per huruf, +20 kalau tanpa salah.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { KETIK_SECONDS, buildKetikWords, ketikPoints } from "@/lib/mp-content";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

/** Kata dengan huruf yang sudah diketik diwarnai hijau (benar) atau merah (salah). */
export function KetikWord({ word, typed }: { word: string; typed: string }) {
  return (
    <p className="font-mono text-4xl font-black tracking-wider">
      {word.split("").map((ch, i) => (
        <span
          key={i}
          className={i < typed.length ? (typed[i] === ch ? "text-emerald-500" : "text-red-500 underline") : "text-slate-800"}
        >
          {ch}
        </span>
      ))}
    </p>
  );
}

export function KetikGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "ketik");

  const [phase, setPhase] = useState<Phase>("start");
  const [words, setWords] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(0);
  const [chars, setChars] = useState(0);
  const [timeLeft, setTimeLeft] = useState(KETIK_SECONDS);
  const [isRecord, setIsRecord] = useState(false);

  const endRef = useRef(0);
  const dirty = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const start = () => {
    setWords(buildKetikWords());
    setIdx(0);
    setTyped("");
    setScore(0);
    setCombo(0);
    setDone(0);
    setChars(0);
    setIsRecord(false);
    setTimeLeft(KETIK_SECONDS);
    dirty.current = false;
    endRef.current = nowMs() + KETIK_SECONDS * 1000;
    setPhase("play");
  };

  useEffect(() => {
    if (phase === "play") inputRef.current?.focus();
  }, [phase]);

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setIsRecord(submit(score));
        setPhase("result");
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const word = words[idx] ?? "";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\s/g, "").toLowerCase();
    if (!word.startsWith(v)) dirty.current = true;
    if (v === word) {
      const clean = !dirty.current;
      setScore((s) => s + ketikPoints(word, clean) + Math.min(combo, 5) * 5);
      setCombo(clean ? combo + 1 : 0);
      setDone((n) => n + 1);
      setChars((n) => n + word.length);
      setIdx((i) => i + 1);
      setTyped("");
      dirty.current = false;
    } else setTyped(v);
  };

  if (phase === "start") return <StartCard game="ketik" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="ketik"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${done} kata · ±${Math.round((chars / 5) * (60 / KETIK_SECONDS))} WPM`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / KETIK_SECONDS} label={`${Math.ceil(timeLeft)}s`} />
      <div className="rounded-2xl border-2 border-slate-200 bg-white py-8 text-center">
        <p className="text-xs font-bold text-slate-400">Ketik kata ini</p>
        <div className="mt-2">
          <KetikWord word={word} typed={typed} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Berikutnya: {words[idx + 1] ?? ""}</p>
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={onChange}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        placeholder="Mulai mengetik…"
        className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center font-mono text-xl font-bold focus:border-indigo-500 focus:outline-none"
      />
      <p className="mt-2 text-center text-xs text-slate-400">Otomatis lanjut kalau sudah benar · tanpa salah = bonus +20</p>
    </div>
  );
}
