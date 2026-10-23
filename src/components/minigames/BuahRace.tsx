"use client";

// =====================================================
// BuahRace — Tangkap Buah (multiplayer)
//
// Jadwal jatuhnya buah/bintang/bom dibuat host, jadi semua pemain
// mendapat urutan yang sama. Skor disiarkan langsung tiap tangkapan.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { BUAH_SECONDS } from "@/lib/mp-content";
import { CatchField } from "./CatchField";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BuahRace({
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
  const schedule = config.buah ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(BUAH_SECONDS);

  const scoreRef = useRef(0);
  const caught = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  useInterval(
    () => {
      if (count <= 1) setStage("play");
      else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  const onCatch = (pts: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    caught.current += 1;
    setScore(scoreRef.current);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: caught.current });
  };

  const onDone = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: caught.current, done: true });
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
        <div className="text-6xl">{MP_MODES.buah.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tangkap Buah</h3>
        <p className="mt-1 text-sm text-slate-500">Geser keranjang, tangkap 🍎 dan ⭐, hindari 💣!</p>
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

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={left < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(left)}s</span>
      </div>
      <CatchField schedule={schedule} seconds={BUAH_SECONDS} active onCatch={onCatch} onTick={setLeft} onDone={onDone} />
      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
