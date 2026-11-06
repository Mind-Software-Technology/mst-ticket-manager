"use client";

// =====================================================
// BinerRace — Kode Biner (multiplayer)
//
// Ronde dibuat host, sama untuk semua pemain. Papan ada di RoundCores;
// skor disiarkan tiap ronde.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { BinerCore } from "./ChallengeCores";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BinerRace({
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
  const rounds = config.biner ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [score, setScore] = useState(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  useInterval(
    () => {
      if (count <= 1) setStage("play");
      else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Mulai dari bit terbesar yang masih muat."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.biner.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Kode Biner</h3>
        <p className="mt-1 text-sm text-slate-500">Ubah desimal ke biner secepat mungkin!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">🏁 Semua ronde selesai! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <BinerCore
        rounds={rounds}
        onScore={(total, n) => {
          setScore(total);
          room.send({ t: "prog", id: me.id, score: total, n });
        }}
        onDone={(total) => {
          if (doneSent.current) return;
          doneSent.current = true;
          setScore(total);
          setStage("done");
          room.send({ t: "prog", id: me.id, score: total, n: rounds.length, done: true });
        }}
      />
      <div className="mt-4 max-w-xs mx-auto">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
