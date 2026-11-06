"use client";

// =====================================================
// CocokRace — Cocok Warna (multiplayer)
//
// Ronde dan papan warna dibuat host, sama untuk semua pemain. Tap semua
// kotak berwarna target. Tiap benar +5, ronde beres +10, salah -5.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { COCOK_COLORS, COCOK_SECONDS } from "@/lib/mp-content";
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

export function CocokRace({
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
  const rounds = config.cocok ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [taken, setTaken] = useState<boolean[]>(() => (rounds[0]?.[1] ?? []).map(() => false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COCOK_SECONDS);

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
      if (ms >= COCOK_SECONDS * 1000) {
        setTimeLeft(0);
        finish(round);
      } else setTimeLeft(COCOK_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const sync = (n: number) => room.send({ t: "prog", id: me.id, score: scoreRef.current, n });

  const tap = (i: number) => {
    if (stage !== "play" || taken[i] || !rounds[round]) return;
    const [target, cells] = rounds[round];
    if (cells[i] !== target) {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setScore(scoreRef.current);
      sync(round);
      return;
    }
    const nextTaken = taken.map((t, k) => (k === i ? true : t));
    const left = cells.filter((c, k) => c === target && !nextTaken[k]).length;
    scoreRef.current += left > 0 ? 5 : 15;
    setScore(scoreRef.current);
    if (left > 0) {
      setTaken(nextTaken);
      sync(round);
      return;
    }
    if (round + 1 >= rounds.length) {
      finish(rounds.length);
      return;
    }
    setRound(round + 1);
    setTaken(rounds[round + 1][1].map(() => false));
    sync(round + 1);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Jangan sampai tertipu warna yang mirip."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.cocok.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Cocok Warna</h3>
        <p className="mt-1 text-sm text-slate-500">Tap semua kotak berwarna target!</p>
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
          {round >= rounds.length ? "🏁 Semua ronde selesai!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const [target, cells] = rounds[round] ?? [0, []];
  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Ronde {round + 1}</span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <p className="mb-2 text-center text-sm font-bold text-slate-500">
        Tap semua yang berwarna{" "}
        <span className="inline-flex items-center gap-1 text-base font-black text-slate-900">
          <span className={`inline-block w-4 h-4 rounded-full ${COCOK_COLORS[target].cls}`} />
          {COCOK_COLORS[target].name.toUpperCase()}
        </span>
      </p>
      <div className={`grid ${cells.length === 9 ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
        {cells.map((c, i) => (
          <button
            key={`${round}-${i}`}
            type="button"
            aria-label={COCOK_COLORS[c].name}
            disabled={taken[i]}
            onPointerDown={() => tap(i)}
            className={`aspect-square rounded-xl transition ${COCOK_COLORS[c].cls} ${taken[i] ? "opacity-15 scale-75" : "active:scale-90"}`}
          />
        ))}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
