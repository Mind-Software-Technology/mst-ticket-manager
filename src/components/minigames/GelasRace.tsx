"use client";

// =====================================================
// GelasRace — Tebak Gelas (multiplayer)
//
// Posisi bola dan urutan tukar gelas dibuat host, jadi sama untuk semua
// pemain. 6 ronde; benar = 100 + 25 x ronde. Skor disiarkan tiap ronde.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { GELAS_ROUNDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "show" | "shuffle" | "pick" | "reveal" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

const stepMs = (r: number) => Math.max(260, 520 - (r + 1) * 30);

export function GelasRace({
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
  const rounds = config.gelas ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [slot, setSlot] = useState<number[]>([0, 1, 2]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const stepRef = useRef(0);
  const pauseRef = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const ball = rounds[round]?.[0] ?? 0;

  const beginRound = (r: number) => {
    setRound(r);
    setSlot([0, 1, 2]);
    setPicked(null);
    stepRef.current = 1;
    pauseRef.current = 0;
    setStage("show");
  };

  useInterval(
    () => {
      if (count <= 1) beginRound(0);
      else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      if (stage === "show") {
        pauseRef.current += 1;
        if (pauseRef.current >= 4) setStage("shuffle");
        return;
      }
      if (stage === "shuffle") {
        const swaps = rounds[round] ?? [];
        if (stepRef.current >= swaps.length) {
          setStage("pick");
          return;
        }
        const code = swaps[stepRef.current];
        stepRef.current += 1;
        const a = Math.floor(code / 3);
        const b = code % 3;
        setSlot((s) => {
          const n = [...s];
          const ia = n.findIndex((p) => p === a);
          const ib = n.findIndex((p) => p === b);
          n[ia] = b;
          n[ib] = a;
          return n;
        });
        return;
      }
      if (stage === "reveal") {
        pauseRef.current += 1;
        if (pauseRef.current >= 4) {
          if (round + 1 >= GELAS_ROUNDS) {
            if (!doneSent.current) {
              doneSent.current = true;
              setStage("done");
              room.send({ t: "prog", id: me.id, score: scoreRef.current, n: GELAS_ROUNDS, done: true });
            }
          } else beginRound(round + 1);
        }
      }
    },
    stage === "show" || stage === "reveal" ? 250 : stage === "shuffle" ? stepMs(round) : null,
  );

  const pick = (c: number) => {
    if (stage !== "pick") return;
    setPicked(c);
    pauseRef.current = 0;
    if (c === ball) {
      scoreRef.current += 100 + 25 * (round + 1);
      setScore(scoreRef.current);
    }
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: round + 1 });
    setStage("reveal");
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Ikuti gelasnya dengan mata, bukan menebak-nebak."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.gelas.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tebak Gelas</h3>
        <p className="mt-1 text-sm text-slate-500">Awasi gelas yang menyembunyikan bola!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">🏁 Semua ronde selesai! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const lifted = stage === "show" || stage === "reveal";
  const message =
    stage === "show"
      ? "Perhatikan bolanya…"
      : stage === "shuffle"
        ? "Diacak!"
        : stage === "pick"
          ? "Di gelas mana bolanya?"
          : picked === ball
            ? "Benar! 🎉"
            : "Salah 😅";

  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
        <span>
          Ronde {round + 1}/{GELAS_ROUNDS}
        </span>
        <span className="text-indigo-600">Skor {score}</span>
      </div>
      <div className="relative h-40 rounded-2xl bg-amber-100 overflow-hidden">
        {[0, 1, 2].map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Gelas ${c + 1}`}
            disabled={stage !== "pick"}
            onPointerDown={() => pick(c)}
            className="absolute top-4 w-1/3 transition-[left] ease-in-out disabled:cursor-default"
            style={{ left: `${slot[c] * 33.333}%`, transitionDuration: `${Math.min(stepMs(round), 400)}ms` }}
          >
            <span className={`block text-6xl transition-transform duration-300 ${lifted && c === ball ? "-translate-y-6" : ""}`}>
              🥤
            </span>
            <span className={`block text-3xl transition-opacity ${lifted && c === ball ? "opacity-100" : "opacity-0"}`}>⚽</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
      <div className="mt-3 text-left">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
