"use client";

// =====================================================
// NumberRace — Sentuh Angka (multiplayer)
//
// Papan angka 1-16 dibuat host, jadi susunannya sama untuk semua
// pemain. Tap berurutan; skor disiarkan langsung tiap angka benar.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { NUMBER_COUNT, NUMBER_SECONDS, numberScore } from "@/lib/mp-content";
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

export function NumberRace({
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
  const grid = config.grid ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [next, setNext] = useState(1);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(NUMBER_SECONDS);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (n: number, final: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
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
      if (ms >= NUMBER_SECONDS * 1000) {
        setTimeLeft(0);
        finish(next - 1, scoreRef.current);
      } else setTimeLeft(NUMBER_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const tap = (n: number) => {
    if (stage !== "play") return;
    if (n !== next) {
      setFlash(n);
      setTimeout(() => setFlash(null), 200);
      return;
    }
    scoreRef.current = numberScore(n, nowMs() - startRef.current);
    setScore(scoreRef.current);
    setNext(n + 1);
    if (n >= NUMBER_COUNT) finish(n, scoreRef.current);
    else room.send({ t: "prog", id: me.id, score: scoreRef.current, n });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Selesai semua angka lebih cepat = bonus waktu lebih besar."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.angka.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Sentuh Angka</h3>
        <p className="mt-1 text-sm text-slate-500">Tap angka 1 sampai 16 berurutan, secepat kilat!</p>
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
          {next > NUMBER_COUNT ? "🏁 Semua angka beres!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Cari <span className="text-2xl font-black text-indigo-600">{next}</span>
        </span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {grid.map((n) => {
          const done = n < next;
          return (
            <button
              key={n}
              type="button"
              disabled={done}
              onPointerDown={() => tap(n)}
              className={`aspect-square rounded-xl text-2xl font-black transition active:scale-95 ${
                done
                  ? "bg-slate-100 text-slate-300"
                  : flash === n
                    ? "bg-red-500 text-white"
                    : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
