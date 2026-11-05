"use client";

// =====================================================
// GameShells — kerangka permainan berbatas waktu
//
// SoloShell  : layar mulai → bermain → hasil + rekor pribadi.
// RaceShell  : hitung mundur → bermain → papan skor langsung → podium.
// Isi permainannya (soal & tampilan) disuplai lewat `children`,
// jadi satu "view" yang sama dipakai untuk mode solo & bareng.
// =====================================================

import { useRef, useState, type ReactNode } from "react";
import { MP_MODES, type MpMessage, type MpMode, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import type { GameKey } from "@/lib/minigame";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

/** Lapor hasil satu jawaban: perubahan skor (boleh negatif) dan benar/salah. */
export type Answer = (delta: number, ok: boolean) => void;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

// ─── Solo ────────────────────────────────────────────

type Phase = "start" | "play" | "result";

export function SoloShell<T>({
  game,
  userId,
  seconds,
  build,
  children,
}: {
  game: GameKey;
  userId?: string;
  seconds: number;
  /** Dipanggil tiap mulai: membuat soal baru. */
  build: () => T;
  children: (data: T, answer: Answer) => ReactNode;
}) {
  const { best, submit } = useBest(userId, game);

  const [phase, setPhase] = useState<Phase>("start");
  const [data, setData] = useState<T | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isRecord, setIsRecord] = useState(false);

  const endRef = useRef(0);

  const start = () => {
    setData(build());
    setScore(0);
    setCombo(0);
    setHits(0);
    setMisses(0);
    setIsRecord(false);
    setTimeLeft(seconds);
    endRef.current = nowMs() + seconds * 1000;
    setPhase("play");
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setIsRecord(submit(score));
        setPhase("result");
      } else setTimeLeft(left);
    },
    phase === "play" ? 100 : null,
  );

  const answer: Answer = (delta, ok) => {
    if (phase !== "play") return;
    setScore((s) => Math.max(0, s + delta));
    setCombo((c) => (ok ? c + 1 : 0));
    if (ok) setHits((n) => n + 1);
    else setMisses((n) => n + 1);
  };

  if (phase === "start") return <StartCard game={game} best={best} onStart={start} blocked={false} />;
  if (phase === "result") {
    return (
      <ResultCard
        game={game}
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} benar · ${misses} salah`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / seconds} label={`${Math.ceil(timeLeft)}s`} />
      {data !== null && children(data, answer)}
    </div>
  );
}

// ─── Bareng ──────────────────────────────────────────

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

export function RaceShell({
  mode,
  room,
  me,
  config,
  onLobby,
  onLeave,
  seconds,
  blurb,
  notice,
  children,
}: {
  mode: MpMode;
  room: RoomApi;
  me: MpPlayer;
  config: StartPayload;
  onLobby: () => void;
  onLeave: () => void;
  seconds: number;
  /** Kalimat singkat di layar hitung mundur. */
  blurb: string;
  notice?: string;
  children: (answer: Answer) => ReactNode;
}) {
  const joined = config.players;
  const cfg = MP_MODES[mode];

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(seconds);

  const [answered, setAnswered] = useState(0);

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
      const left = seconds - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setStage("done");
        room.send({ t: "prog", id: me.id, score, n: answered, done: true });
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const answer: Answer = (delta) => {
    if (stage !== "play") return;
    const next = Math.max(0, score + delta);
    setScore(next);
    setAnswered(answered + 1);
    room.send({ t: "prog", id: me.id, score: next, n: answered + 1 });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={notice}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{cfg.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">{cfg.label}</h3>
        <p className="mt-1 text-sm text-slate-500">{blurb}</p>
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
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      {children(answer)}
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
