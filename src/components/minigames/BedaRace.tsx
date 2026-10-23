"use client";

// =====================================================
// BedaRace — Cari Beda (multiplayer)
//
// Papan dibuat host, jadi semua pemain mendapat soal yang sama.
// Benar +10 (lanjut soal berikutnya), salah -5. Skor disiarkan langsung.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { BEDA_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { BedaBoard } from "./BedaGame";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BedaRace({
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
  const seq = config.beda ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BEDA_SECONDS);

  const scoreRef = useRef(0);
  const startRef = useRef(0);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  useInterval(
    () => {
      if (count <= 1) {
        startRef.current = nowMs();
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const left = BEDA_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setStage("done");
        room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index, done: true });
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const pick = (pos: number) => {
    const item = seq[index];
    if (stage !== "play" || !item) return;
    if (pos === item[2]) {
      scoreRef.current += 10;
      setIndex(index + 1);
    } else {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setScore(scoreRef.current);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.beda.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Cari Beda</h3>
        <p className="mt-1 text-sm text-slate-500">Temukan emoji yang beda sendiri!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">Waktu habis! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const item = seq[index];
  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      {item && <BedaBoard index={index} item={item} onPick={pick} wrong={wrong} />}
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
