"use client";

// =====================================================
// LompatRace — Lompat Rintangan (multiplayer)
//
// Jadwal rintangan & bintang dibuat host, jadi sama untuk semua pemain.
// Menabrak = selesai; bertahan sampai akhir = bonus. Skor tertinggi menang.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  LOMPAT_FINISH_BONUS,
  LOMPAT_JUMP_TICKS,
  LOMPAT_MAX_TICKS,
  LOMPAT_TICK_MS,
  lompatHeight,
  lompatScore,
  stepLompat,
  type LompatItem,
} from "@/lib/lompat";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { LompatArena } from "./LompatArena";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function LompatRace({
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
  const schedule = config.lompat ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [items, setItems] = useState<LompatItem[]>([]);
  const [jump, setJump] = useState(-1);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [crashed, setCrashed] = useState(false);

  const ticksRef = useRef(0);
  const idRef = useRef(0);
  const nextRef = useRef(0);
  const jumpRef = useRef(-1);
  const starsRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (total: number, hit: boolean) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setScore(total);
    setCrashed(hit);
    setStage("done");
    room.send({ t: "prog", id: me.id, score: total, n: starsRef.current, done: true });
  };

  const doJump = () => {
    if (jumpRef.current < 0) {
      jumpRef.current = 0;
      setJump(0);
    }
  };

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
      if (jumpRef.current >= 0) {
        jumpRef.current += 1;
        if (jumpRef.current >= LOMPAT_JUMP_TICKS) jumpRef.current = -1;
      }
      const spawned: LompatItem[] = [];
      while (nextRef.current < schedule.length && schedule[nextRef.current][0] <= t) {
        spawned.push({ id: idRef.current++, x: 100, star: schedule[nextRef.current][1] === 1 });
        nextRef.current += 1;
      }
      const res = stepLompat([...items, ...spawned], lompatHeight(jumpRef.current));
      starsRef.current += res.stars;
      const total = lompatScore(t, starsRef.current);
      setItems(res.items);
      setJump(jumpRef.current);
      setStars(starsRef.current);
      setScore(total);
      if (res.hit) finish(total, true);
      else if (t >= LOMPAT_MAX_TICKS) finish(total + LOMPAT_FINISH_BONUS, false);
      else if (res.stars > 0 || t % 25 === 0) {
        room.send({ t: "prog", id: me.id, score: total, n: starsRef.current });
      }
    },
    stage === "play" ? LOMPAT_TICK_MS : null,
  );

  useEffect(() => {
    if (stage !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        doJump();
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
        notice="Bertahan paling lama sambil mengumpulkan bintang = skor tertinggi."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.lompat.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Lompat Rintangan</h3>
        <p className="mt-1 text-sm text-slate-500">Lompati kaktus, ambil bintang, bertahan paling lama!</p>
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
          {crashed ? "💥 Nyangkut di kaktus!" : "🏁 Bertahan sampai akhir!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
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
      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
