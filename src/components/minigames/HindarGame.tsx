"use client";

// =====================================================
// HindarGame — Hindari Rintangan (solo)
//
// 3 jalur. Geser mobil antar jalur (← → / A D / tombol layar), hindari 🚧
// dan kumpulkan 🪙 (+15). Jarak tempuh menambah skor. Menabrak = selesai.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { ResultCard, StartCard, useBest, useInterval } from "./GameParts";

type Phase = "start" | "play" | "result";

interface Item {
  id: number;
  lane: number;
  y: number; // persen dari atas
  coin: boolean;
}

const TICK = 40;
const CAR_Y = 82; // posisi atas mobil (persen)

export function HindarGame({ userId }: { userId?: string }) {
  const { best, submit } = useBest(userId, "hindar");

  const [phase, setPhase] = useState<Phase>("start");
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const idRef = useRef(0);
  const ticksRef = useRef(0);

  const start = () => {
    setLane(1);
    setItems([]);
    setScore(0);
    setCoins(0);
    setIsRecord(false);
    ticksRef.current = 0;
    setPhase("play");
  };

  const move = (d: number) => setLane((l) => Math.max(0, Math.min(2, l + d)));

  useInterval(
    () => {
      ticksRef.current += 1;
      const t = ticksRef.current;
      const speed = 1.6 + Math.min(t / 600, 2.2);
      let crashed = false;
      let gotCoins = 0;
      let next = items
        .map((it) => ({ ...it, y: it.y + speed }))
        .filter((it) => {
          const touching = it.lane === lane && it.y > CAR_Y - 9 && it.y < CAR_Y + 9;
          if (touching) {
            if (it.coin) {
              gotCoins += 1;
              return false;
            }
            crashed = true;
          }
          return it.y < 105;
        });
      const every = Math.max(14, 30 - Math.floor(t / 150));
      if (t % every === 0) {
        const coin = Math.random() < 0.3;
        next = [...next, { id: idRef.current++, lane: Math.floor(Math.random() * 3), y: -10, coin }];
        // kadang dua rintangan sekaligus (selalu sisakan satu jalur kosong)
        if (!coin && t > 400 && Math.random() < 0.35) {
          const other = (next[next.length - 1].lane + 1 + Math.floor(Math.random() * 2)) % 3;
          next.push({ id: idRef.current++, lane: other, y: -10, coin: false });
        }
      }
      const total = Math.floor(t / 10) + (coins + gotCoins) * 15;
      setItems(next);
      setCoins((c) => c + gotCoins);
      setScore(total);
      if (crashed) {
        setIsRecord(submit(total));
        setPhase("result");
      }
    },
    phase === "play" ? TICK : null,
  );

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        e.preventDefault();
        move(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "start") return <StartCard game="hindar" best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game="hindar"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${coins} koin terkumpul`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className="text-amber-600">🪙 {coins}</span>
      </div>
      <div className="relative h-80 rounded-2xl bg-slate-700 overflow-hidden">
        <div className="absolute inset-y-0 left-1/3 w-px border-l-2 border-dashed border-white/30" />
        <div className="absolute inset-y-0 left-2/3 w-px border-l-2 border-dashed border-white/30" />
        {items.map((it) => (
          <div
            key={it.id}
            className="absolute w-1/3 text-center text-3xl"
            style={{ left: `${it.lane * 33.333}%`, top: `${it.y}%` }}
          >
            {it.coin ? "🪙" : "🚧"}
          </div>
        ))}
        <div
          className="absolute w-1/3 text-center text-3xl transition-[left] duration-100"
          style={{ left: `${lane * 33.333}%`, top: `${CAR_Y}%` }}
        >
          🏎️
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onPointerDown={() => move(-1)}
          className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:bg-slate-100"
        >
          ◀
        </button>
        <button
          type="button"
          onPointerDown={() => move(1)}
          className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:bg-slate-100"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
