"use client";

// =====================================================
// BesarRace — Lebih Besar (multiplayer)
//
// Soal dibuat host, jadi semua pemain mendapat urutan yang sama.
// Tap sisi dengan nilai lebih besar: benar +10, salah -5.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { BESAR_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { BesarCards, useSideKeys, type Side } from "./BesarGame";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BesarRace({
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
  const seq = config.besar ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BESAR_SECONDS);

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
      const left = BESAR_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setStage("done");
        room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index, done: true });
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const pick = (side: Side) => {
    const item = seq[index];
    if (stage !== "play" || !item) return;
    const correct: Side = item[1] > item[3] ? "L" : "R";
    if (side === correct) scoreRef.current += 10;
    else {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setScore(scoreRef.current);
    setIndex(index + 1);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index + 1 });
  };

  useSideKeys(stage === "play", pick);

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
        <div className="text-6xl">{MP_MODES.besar.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Lebih Besar</h3>
        <p className="mt-1 text-sm text-slate-500">Tap sisi yang nilainya lebih besar!</p>
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
      {item && <BesarCards item={item} onPick={pick} wrong={wrong} />}
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
