"use client";

// =====================================================
// HindarRace — Hindari Rintangan (multiplayer)
//
// Jadwal rintangan & koin dibuat host, jadi sama untuk semua pemain.
// Menabrak = selesai; sampai garis akhir (waktu habis) = bonus selesai.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { HINDAR_MAX_TICKS, HINDAR_TICK_MS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const CAR_Y = 82;
const FINISH_BONUS = 100;

interface Item {
  id: number;
  lane: number;
  y: number;
  coin: boolean;
}

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function HindarRace({
  room,
  me,
  config,
  onLobby,
  onLeave,
}: {
  room: RoomApi;
  me: MpPlayer;
  config: StartPayload;
  onLobby: () => void;
  onLeave: () => void;
}) {
  const schedule = config.hindar ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [crashed, setCrashed] = useState(false);

  const ticksRef = useRef(0);
  const idRef = useRef(0);
  const nextRef = useRef(0);
  const coinsRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (total: number, hit: boolean) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setScore(total);
    setCrashed(hit);
    setStage("done");
    room.send({ t: "prog", id: me.id, score: total, n: coinsRef.current, done: true });
  };

  const move = (d: number) => setLane((l) => Math.max(0, Math.min(2, l + d)));

  useInterval(
    () => {
      if (count <= 1) setStage("play");
      else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      ticksRef.current += 1;
      const t = ticksRef.current;
      const speed = 1.6 + Math.min(t / 600, 2.2);
      let hit = false;
      let got = 0;
      let next = items
        .map((it) => ({ ...it, y: it.y + speed }))
        .filter((it) => {
          const touching = it.lane === lane && it.y > CAR_Y - 9 && it.y < CAR_Y + 9;
          if (touching) {
            if (it.coin) {
              got += 1;
              return false;
            }
            hit = true;
          }
          return it.y < 105;
        });
      while (nextRef.current < schedule.length && schedule[nextRef.current][0] <= t) {
        const [, l, coin, second] = schedule[nextRef.current];
        next.push({ id: idRef.current++, lane: l, y: -10, coin: coin === 1 });
        if (second >= 0) next.push({ id: idRef.current++, lane: second, y: -10, coin: false });
        nextRef.current += 1;
      }
      next = next.slice(-30);
      coinsRef.current += got;
      const total = Math.floor(t / 10) + coinsRef.current * 15;
      setItems(next);
      setCoins(coinsRef.current);
      setScore(total);
      if (hit) {
        finish(total, true);
      } else if (t >= HINDAR_MAX_TICKS) {
        finish(total + FINISH_BONUS, false);
      } else if (got > 0 || t % 25 === 0) {
        room.send({ t: "prog", id: me.id, score: total, n: coinsRef.current });
      }
    },
    stage === "play" ? HINDAR_TICK_MS : null,
  );

  useEffect(() => {
    if (stage !== "play") return;
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
  }, [stage]);

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Bertahan paling jauh sambil mengumpulkan koin = skor tertinggi."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.hindar.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Hindari Rintangan</h3>
        <p className="mt-1 text-sm text-slate-500">Bertahan paling jauh dan kumpulkan koin!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">
          {crashed ? "💥 Tabrakan!" : "🏁 Sampai garis akhir!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
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
      <div className="relative h-72 rounded-2xl bg-slate-700 overflow-hidden">
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
        <button type="button" onPointerDown={() => move(-1)} className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:bg-slate-100">
          ◀
        </button>
        <button type="button" onPointerDown={() => move(1)} className="py-3 rounded-xl bg-white border border-slate-200 text-xl font-black active:bg-slate-100">
          ▶
        </button>
      </div>
      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
