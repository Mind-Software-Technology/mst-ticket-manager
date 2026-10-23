"use client";

// =====================================================
// StroopRace — Warna Mengecoh (multiplayer)
//
// Urutan kata & warna dibuat host, jadi semua pemain mendapat soal
// yang sama. Tap warna TINTA: benar +10, salah -5. Skor disiarkan langsung.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { STROOP_COLORS, STROOP_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { STROOP_BG, STROOP_TEXT } from "./StroopGame";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function StroopRace({
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
  const seq = config.stroop ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [timeLeft, setTimeLeft] = useState(STROOP_SECONDS);

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
      const left = STROOP_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setStage("done");
        room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index, done: true });
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const pick = (c: number) => {
    const item = seq[index];
    if (stage !== "play" || !item) return;
    if (c === item[1]) scoreRef.current += 10;
    else {
      scoreRef.current = Math.max(0, scoreRef.current - 5);
      setWrong(true);
      setTimeout(() => setWrong(false), 200);
    }
    setScore(scoreRef.current);
    setIndex(index + 1);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: index + 1 });
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
        <div className="text-6xl">{MP_MODES.warna.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Warna Mengecoh</h3>
        <p className="mt-1 text-sm text-slate-500">Tap warna TINTA-nya, bukan tulisannya!</p>
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

  const item = seq[index] ?? [0, 0];
  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className={`rounded-2xl bg-white border-2 py-8 text-center transition-colors ${wrong ? "border-red-400" : "border-slate-200"}`}>
        <p className="text-xs font-bold text-slate-400">Warna TINTA-nya apa?</p>
        <p className={`mt-2 text-5xl font-black ${STROOP_TEXT[item[1]]}`}>{STROOP_COLORS[item[0]]}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {STROOP_COLORS.map((name, c) => (
          <button
            key={name}
            type="button"
            onPointerDown={() => pick(c)}
            className={`h-16 rounded-2xl text-white text-lg font-black shadow-md active:scale-95 transition ${STROOP_BG[c]}`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
