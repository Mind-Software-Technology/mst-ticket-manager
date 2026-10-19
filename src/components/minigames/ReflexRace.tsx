"use client";

// =====================================================
// ReflexRace — Refleks Kilat (multiplayer)
//
// Jeda tunggu tiap ronde dibuat host, jadi semua pemain melihat
// "TAP!" di waktu yang hampir sama. Poin = 1000 - waktu reaksi (ms).
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { REFLEX_ROUNDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";

type Phase = "countdown" | "wait" | "go" | "result" | "done";
const COUNTDOWN_MS = 3000;
const GO_TIMEOUT_MS = 2000;
const RESULT_MS = 1400;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function ReflexRace({
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
  const delays = config.delays ?? [];
  const joined = config.players;

  const [phase, setPhase] = useState<Phase>("countdown");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [early, setEarly] = useState(false);
  const goAt = useRef(0);
  const scoreRef = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, phase === "done");

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };

  const endRound = (i: number, ms: number | null) => {
    const pts = ms === null ? 0 : Math.max(0, 1000 - ms);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setLastMs(ms);
    setPhase("result");
    const last = i + 1 >= REFLEX_ROUNDS;
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: i + 1, done: last });
    later(() => (last ? setPhase("done") : startRound(i + 1)), RESULT_MS);
  };

  const startRound = (i: number) => {
    setRound(i);
    setEarly(false);
    setLastMs(null);
    setPhase("wait");
    later(() => {
      goAt.current = nowMs();
      setPhase("go");
      // Tidak sempat tap = 0 poin.
      later(() => endRound(i, null), GO_TIMEOUT_MS);
    }, delays[i] ?? 2000);
  };

  useEffect(() => {
    later(() => startRound(0), COUNTDOWN_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (phase === "wait") {
      // Kepagian: batalkan timer ronde ini, ronde dihitung 0.
      clearTimers();
      setEarly(true);
      endRound(round, null);
    } else if (phase === "go") {
      clearTimers();
      endRound(round, nowMs() - goAt.current);
    }
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

  if (phase === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.reflex.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Refleks Kilat</h3>
        <p className="mt-1 text-sm text-slate-500">Tunggu layar hijau, lalu tap! Jangan kepagian.</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">Selesai! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const bg =
    phase === "wait"
      ? "bg-red-500"
      : phase === "go"
        ? "bg-emerald-500"
        : early
          ? "bg-amber-500"
          : lastMs === null
            ? "bg-slate-500"
            : "bg-indigo-600";

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Ronde {round + 1}/{REFLEX_ROUNDS}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>

      <button
        type="button"
        onPointerDown={tap}
        className={`w-full h-56 rounded-2xl text-white flex flex-col items-center justify-center transition-colors duration-75 active:scale-[0.99] ${bg}`}
      >
        {phase === "wait" && (
          <>
            <span className="text-5xl">✋</span>
            <span className="mt-2 text-2xl font-black">Tunggu…</span>
          </>
        )}
        {phase === "go" && <span className="text-6xl font-black animate-lb-pop">TAP!</span>}
        {phase === "result" && (
          <>
            <span className="text-5xl font-black">
              {early ? "Kepagian! 🙈" : lastMs === null ? "Telat 🐌" : `${lastMs} ms`}
            </span>
            <span className="mt-2 text-sm font-semibold opacity-90">
              {early || lastMs === null ? "0 poin" : `+${Math.max(0, 1000 - lastMs)} poin`}
            </span>
          </>
        )}
      </button>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
