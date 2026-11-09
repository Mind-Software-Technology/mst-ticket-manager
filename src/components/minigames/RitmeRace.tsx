"use client";

// =====================================================
// RitmeRace — Ritme Tap (multiplayer)
//
// Chart nada dibuat host, jadi sama untuk semua pemain. Skor tertinggi
// menang; skor semua pemain terlihat langsung.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { RitmeArena } from "./RitmeArena";
import { useRitme } from "./useRitme";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function RitmeRace({
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
  const chart = config.ritme ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const doneSent = useRef(false);

  const r = useRitme(chart, stage === "play", {
    onChange: (s) => {
      room.send({ t: "prog", id: me.id, score: s, n: 0 });
    },
    onEnd: (s) => {
      if (doneSent.current) return;
      doneSent.current = true;
      setStage("done");
      room.send({ t: "prog", id: me.id, score: s, n: 0, done: true });
    },
  });

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, r.score, stage === "done");

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
        notice="Ketukan paling tepat dan kombo terpanjang = skor tertinggi."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.ritme.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Ritme Tap</h3>
        <p className="mt-1 text-sm text-slate-500">Tap jalur saat nada tepat di garis. Tombol D F J K juga bisa!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">🎵 Lagu selesai! Skormu {r.score}. Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{r.score}</span>
        </span>
        <span className="text-orange-600">🔥 {r.combo}</span>
      </div>
      <RitmeArena notes={r.notes} flash={r.flash} combo={r.combo} active onTap={r.tap} />
      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
