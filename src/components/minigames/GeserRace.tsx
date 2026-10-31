"use client";

// =====================================================
// GeserRace — Puzzle Geser (multiplayer)
//
// Susunan awal papan dibuat host, jadi sama untuk semua pemain. Skor
// sementara (20 per kotak pas) disiarkan tiap geseran; selesai = skor penuh.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  GESER_SECONDS,
  GESER_SOLVED,
  geserCorrect,
  geserNeighbours,
  geserSolveScore,
} from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function GeserRace({
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
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [tiles, setTiles] = useState<number[]>(() => config.geser ?? GESER_SOLVED);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GESER_SECONDS);

  const startRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (final: number, n: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setScore(final);
    setStage("done");
    room.send({ t: "prog", id: me.id, score: final, n, done: true });
  };

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
      const ms = nowMs() - startRef.current;
      if (ms >= GESER_SECONDS * 1000) {
        setTimeLeft(0);
        finish(geserCorrect(tiles) * 20, moves);
      } else setTimeLeft(GESER_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const tap = (i: number) => {
    if (stage !== "play") return;
    const blank = tiles.indexOf(0);
    if (!geserNeighbours(blank).includes(i)) return;
    const next = [...tiles];
    next[blank] = next[i];
    next[i] = 0;
    const m = moves + 1;
    setTiles(next);
    setMoves(m);
    if (next.every((v, k) => v === GESER_SOLVED[k])) {
      setSolved(true);
      const secsLeft = Math.floor(GESER_SECONDS - (nowMs() - startRef.current) / 1000);
      finish(geserSolveScore(secsLeft, m), m);
    } else {
      const live = geserCorrect(next) * 20;
      setScore(live);
      room.send({ t: "prog", id: me.id, score: live, n: m });
    }
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Menyelesaikan puzzle jauh lebih bernilai daripada sekadar kotak pas."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.geser.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Puzzle Geser</h3>
        <p className="mt-1 text-sm text-slate-500">Urutkan angka 1-8 lebih dulu dari rekanmu!</p>
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
          {solved ? "🏁 Puzzle selesai!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">{moves} langkah</span>
        <span className={timeLeft < 15 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-200 p-2.5">
        {tiles.map((v, i) =>
          v === 0 ? (
            <div key={i} className="aspect-square rounded-xl bg-slate-300/60" />
          ) : (
            <button
              key={i}
              type="button"
              onPointerDown={() => tap(i)}
              className={`aspect-square rounded-xl text-3xl font-black shadow-md transition active:scale-90 ${
                v === GESER_SOLVED[i]
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white"
                  : "bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white"
              }`}
            >
              {v}
            </button>
          ),
        )}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
