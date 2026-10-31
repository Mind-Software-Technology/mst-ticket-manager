"use client";

// =====================================================
// TepatRace — Tepat Waktu (multiplayer)
//
// Target detik tiap ronde dibuat host, sama untuk semua pemain. Penghitung
// waktu hanya terlihat sebentar lalu menghilang; pemain menekan STOP saat
// merasa target tercapai. Skor disiarkan tiap ronde selesai.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { TEPAT_GRACE_MS, TEPAT_ROUNDS, TEPAT_VISIBLE_MS, tepatPoints } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useDelay, useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
type Phase = "run" | "result";
const COUNTDOWN = 3;
const RESULT_MS = 2200;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function TepatRace({
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
  const targets = config.tepat ?? [];
  const joined = config.players;
  const delay = useDelay();

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("run");
  const [elapsed, setElapsed] = useState(0);
  /** Selisih (ms, bertanda) ronde ini; null = lewat batas tanpa menekan STOP. */
  const [errorMs, setErrorMs] = useState<number | null>(null);
  const [gained, setGained] = useState(0);
  const [score, setScore] = useState(0);

  const roundStart = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);
  /** Token ronde: timer lama yang sudah tidak relevan diabaikan. */
  const token = useRef(0);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const targetMs = (targets[round] ?? 5) * 1000;

  const finish = (n: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n, done: true });
  };

  const startRound = (i: number) => {
    token.current += 1;
    roundStart.current = nowMs();
    setRound(i);
    setElapsed(0);
    setErrorMs(null);
    setGained(0);
    setPhase("run");
  };

  const endRound = (i: number, err: number | null) => {
    token.current += 1;
    const mine = token.current;
    const pts = err === null ? 0 : tepatPoints(err);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setErrorMs(err);
    setGained(pts);
    setPhase("result");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: i + 1 });
    delay(() => {
      if (token.current !== mine) return;
      if (i + 1 >= TEPAT_ROUNDS) finish(i + 1);
      else startRound(i + 1);
    }, RESULT_MS);
  };

  useInterval(
    () => {
      if (count <= 1) {
        startRound(0);
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const ms = nowMs() - roundStart.current;
      setElapsed(ms);
      if (ms > targetMs + TEPAT_GRACE_MS) endRound(round, null);
    },
    stage === "play" && phase === "run" ? 40 : null,
  );

  const stop = () => {
    if (stage !== "play" || phase !== "run") return;
    endRound(round, nowMs() - roundStart.current - targetMs);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Hitung dalam hati: makin tepat, makin dekat ke 1000 poin per ronde."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.tepat.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tepat Waktu</h3>
        <p className="mt-1 text-sm text-slate-500">Tekan STOP tepat di detik yang diminta. Penghitung akan menghilang!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">🏁 Selesai! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const visible = phase === "run" && elapsed < TEPAT_VISIBLE_MS;
  const resultText =
    errorMs === null
      ? "Kelewatan! 0 poin"
      : Math.abs(errorMs) < 50
        ? "🎯 PAS BANGET!"
        : `${errorMs > 0 ? "Telat" : "Kecepetan"} ${(Math.abs(errorMs) / 1000).toFixed(2)} detik`;

  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Ronde {round + 1}/{TEPAT_ROUNDS}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>

      <div className="rounded-2xl bg-slate-800 px-4 py-6 text-white">
        <p className="text-xs font-bold text-slate-400">Tekan STOP tepat di</p>
        <p className="text-5xl font-black text-yellow-300">{targets[round] ?? 5} detik</p>
        <p className="mt-4 font-mono text-5xl font-black tabular-nums">
          {phase === "result" ? ((targetMs + (errorMs ?? 0)) / 1000).toFixed(2) : visible ? (elapsed / 1000).toFixed(2) : "?.??"}
        </p>
        <p className="mt-1 h-5 text-xs font-semibold text-slate-400">
          {phase === "result" ? "" : visible ? "Perhatikan ritmenya…" : "Waktu disembunyikan — hitung sendiri!"}
        </p>
      </div>

      {phase === "run" ? (
        <button
          type="button"
          onPointerDown={stop}
          className="mt-4 h-24 w-full touch-none rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-3xl font-black text-white shadow-xl transition-transform duration-75 active:scale-95"
        >
          STOP ✋
        </button>
      ) : (
        <div className={`mt-4 rounded-2xl px-4 py-5 ${gained >= 700 ? "bg-emerald-100 text-emerald-800" : gained > 0 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
          <p className="text-lg font-black">{resultText}</p>
          <p className="text-sm font-bold">+{gained} poin</p>
        </div>
      )}

      <div className="mt-4 text-left">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
