"use client";

// =====================================================
// LompatGame — Lompat Rintangan (solo)
//
// 60 detik lari otomatis. Lompati 🌵 (tap / Spasi / ↑), ambil ⭐ di udara
// (+20). Menabrak = selesai. Bertahan sampai akhir = bonus.
// =====================================================

import { useEffect, useRef, useState } from "react";
import {
  LOMPAT_FINISH_BONUS,
  LOMPAT_JUMP_TICKS,
  LOMPAT_MAX_TICKS,
  LOMPAT_TICK_MS,
  buildLompatSchedule,
  lompatHeight,
  lompatScore,
  stepLompat,
  type LompatItem,
  type LompatSpawn,
} from "@/lib/lompat";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";
import { LompatArena } from "./LompatArena";

type Phase = "start" | "play" | "result";

export function LompatGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "lompat");

  const [phase, setPhase] = useState<Phase>("start");
  const [items, setItems] = useState<LompatItem[]>([]);
  const [jump, setJump] = useState(-1);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const [survived, setSurvived] = useState(0);

  const scheduleRef = useRef<LompatSpawn[]>([]);
  const nextRef = useRef(0);
  const ticksRef = useRef(0);
  const idRef = useRef(0);
  const jumpRef = useRef(-1);
  const starsRef = useRef(0);

  const start = () => {
    scheduleRef.current = buildLompatSchedule();
    nextRef.current = 0;
    ticksRef.current = 0;
    jumpRef.current = -1;
    starsRef.current = 0;
    setItems([]);
    setJump(-1);
    setScore(0);
    setStars(0);
    setIsRecord(false);
    setPhase("play");
  };

  const doJump = () => {
    if (jumpRef.current < 0) {
      jumpRef.current = 0;
      setJump(0);
    }
  };

  const finish = (total: number) => {
    setScore(total);
    setSurvived(Math.round((ticksRef.current * LOMPAT_TICK_MS) / 1000));
    setIsRecord(submit(total));
    setPhase("result");
  };

  useInterval(
    () => {
      ticksRef.current += 1;
      const t = ticksRef.current;
      if (jumpRef.current >= 0) {
        jumpRef.current += 1;
        if (jumpRef.current >= LOMPAT_JUMP_TICKS) jumpRef.current = -1;
      }
      const sch = scheduleRef.current;
      const spawned: LompatItem[] = [];
      while (nextRef.current < sch.length && sch[nextRef.current][0] <= t) {
        spawned.push({ id: idRef.current++, x: 100, star: sch[nextRef.current][1] === 1 });
        nextRef.current += 1;
      }
      const res = stepLompat([...items, ...spawned], lompatHeight(jumpRef.current));
      starsRef.current += res.stars;
      const total = lompatScore(t, starsRef.current);
      setItems(res.items);
      setJump(jumpRef.current);
      setStars(starsRef.current);
      setScore(total);
      if (res.hit) finish(total);
      else if (t >= LOMPAT_MAX_TICKS) finish(total + LOMPAT_FINISH_BONUS);
    },
    phase === "play" ? LOMPAT_TICK_MS : null,
  );

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        doJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "start") return <StartCard game="lompat" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="lompat"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${stars} bintang · ${survived} detik bertahan`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className="text-amber-600">⭐ {stars}</span>
      </div>
      <LompatArena items={items} jump={jump} onJump={doJump} />
      <button
        type="button"
        onPointerDown={doJump}
        className="mt-3 w-full py-4 rounded-xl bg-indigo-600 text-white text-lg font-black active:scale-95 transition"
      >
        LOMPAT ⬆
      </button>
    </div>
  );
}
