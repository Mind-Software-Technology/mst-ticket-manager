"use client";

// =====================================================
// SentuhRace — Sentuh Angka (multiplayer)
//
// Papan angka 1..25 dibuat host, sama untuk semua pemain. Tap berurutan
// mulai dari 1; selesai semua = bonus sisa waktu.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { SENTUH_COUNT, SENTUH_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function SentuhRace({
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
  const grid = config.sentuh ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [next, setNext] = useState(1);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(SENTUH_SECONDS);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (n: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n, done: true });
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
      if (ms >= SENTUH_SECONDS * 1000) {
        setTimeLeft(0);
        finish(next - 1);
      } else setTimeLeft(SENTUH_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const tap = (n: number) => {
    if (stage !== "play") return;
    if (n !== next) {
      scoreRef.current = Math.max(0, scoreRef.current - 3);
      setScore(scoreRef.current);
      setWrong(n);
      setTimeout(() => setWrong(null), 250);
      return;
    }
    scoreRef.current += 10;
    if (n >= SENTUH_COUNT) {
      scoreRef.current += Math.floor(SENTUH_SECONDS - (nowMs() - startRef.current) / 1000) * 5;
      setScore(scoreRef.current);
      setNext(n + 1);
      finish(SENTUH_COUNT);
      return;
    }
    setScore(scoreRef.current);
    setNext(n + 1);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Cari angka berikutnya sambil mata sudah melirik ke angka sesudahnya."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.sentuh.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Sentuh Angka</h3>
        <p className="mt-1 text-sm text-slate-500">Tap angka 1 sampai 25 secepat mungkin!</p>
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
          {next > SENTUH_COUNT ? "🏁 Semua angka tersentuh!" : "⏱ Waktu habis!"} Menunggu pemain lain…
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
        <span className="text-slate-500">
          Cari: <span className="text-xl font-black text-indigo-600">{next}</span>
        </span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {grid.map((n) => (
          <button
            key={n}
            type="button"
            disabled={n < next}
            onPointerDown={() => tap(n)}
            className={`aspect-square rounded-xl text-lg font-black transition ${
              n < next
                ? "bg-emerald-100 text-emerald-300"
                : wrong === n
                  ? "bg-red-500 text-white"
                  : "bg-white border border-slate-200 text-slate-800 active:scale-90"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
