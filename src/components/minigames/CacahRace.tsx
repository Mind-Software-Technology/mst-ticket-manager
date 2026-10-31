"use client";

// =====================================================
// CacahRace — Hitung Emoji (multiplayer)
//
// Papan emoji dan pilihan angka dibuat host, jadi sama untuk semua pemain.
// Hitung emoji yang diminta lalu pilih angkanya. Skor disiarkan tiap jawaban.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { CACAH_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const RIGHT = 100;
const WRONG = 20;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function CacahRace({
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
  const questions = config.cacah ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [timeLeft, setTimeLeft] = useState(CACAH_SECONDS);

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
      if (ms >= CACAH_SECONDS * 1000) {
        setTimeLeft(0);
        finish(qIdx);
      } else setTimeLeft(CACAH_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const pick = (i: number) => {
    const q = questions[qIdx];
    if (stage !== "play" || !q) return;
    const ok = i === q[3];
    scoreRef.current = Math.max(0, scoreRef.current + (ok ? RIGHT : -WRONG));
    setScore(scoreRef.current);
    setFlash(ok ? "ok" : "bad");
    setTimeout(() => setFlash(null), 250);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: qIdx + 1 });
    if (qIdx + 1 >= questions.length) finish(qIdx + 1);
    else setQIdx(qIdx + 1);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Hitung per baris supaya tidak ada yang terlewat."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.cacah.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Hitung Emoji</h3>
        <p className="mt-1 text-sm text-slate-500">Hitung berapa banyak emoji yang diminta. Mata jeli!</p>
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

  const q = questions[qIdx];
  if (!q) return null;
  const [cells, target, options] = q;

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Papan {qIdx + 1}/{questions.length}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <p className="text-center text-sm font-bold text-slate-600">
        Ada berapa <span className="text-2xl">{target}</span> di papan ini?
      </p>

      <div
        className={`mt-2 grid grid-cols-6 gap-1 rounded-2xl border-2 bg-white p-2 text-center text-2xl transition-colors ${
          flash === "ok" ? "border-emerald-400" : flash === "bad" ? "border-red-400" : "border-slate-200"
        }`}
      >
        {cells.map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {options.map((n, i) => (
          <button
            key={`${qIdx}-${n}`}
            type="button"
            onPointerDown={() => pick(i)}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 py-3 text-2xl font-black text-white shadow-md transition active:scale-90"
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
