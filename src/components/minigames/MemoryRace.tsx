"use client";

// =====================================================
// MemoryRace — Memori Kilat (multiplayer)
//
// Susunan kartu dibuat host, jadi semua pemain memegang papan yang
// sama. Skor tiap pemain disiarkan langsung.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const SECONDS = 60;
const MISMATCH_MS = 700;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function MemoryRace({
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
  const deck = config.deck ?? [];
  const joined = config.players;
  const isHost = config.hostId === me.id;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [timeLeft, setTimeLeft] = useState(SECONDS);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const endRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  useInterval(
    () => {
      if (count <= 1) {
        endRef.current = nowMs() + SECONDS * 1000;
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  const finish = (finalScore: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: finalScore, n: 0, done: true });
  };

  useInterval(
    () => {
      const left = (endRef.current - nowMs()) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(score);
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const flip = (i: number) => {
    if (stage !== "play" || locked || open.includes(i) || matched.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;

    const [a, b] = next;
    if (deck[a] === deck[b]) {
      const matchedNow = [...matched, a, b];
      let total = score + 100 + Math.min(streak, 5) * 20;
      setMatched(matchedNow);
      setOpen([]);
      setStreak((s) => s + 1);
      if (matchedNow.length === deck.length) {
        // Semua cocok: bonus sisa waktu.
        total += Math.round(((endRef.current - nowMs()) / 1000) * 5);
        setScore(total);
        finish(total);
      } else {
        setScore(total);
        room.send({ t: "prog", id: me.id, score: total, n: matchedNow.length / 2 });
      }
    } else {
      const total = Math.max(0, score - 10);
      setLocked(true);
      setStreak(0);
      setScore(total);
      room.send({ t: "prog", id: me.id, score: total, n: matched.length / 2 });
      setTimeout(() => {
        setOpen([]);
        setLocked(false);
      }, MISMATCH_MS);
    }
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        onBack={isHost ? onLobby : undefined}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.memory.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Memori Kilat</h3>
        <p className="mt-1 text-sm text-slate-500">Pasang mata elang…</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={streak >= 2 ? "text-orange-500 scale-110" : "text-slate-300"}>🔥 x{streak}</span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      {stage === "play" ? (
        <div className="grid grid-cols-4 gap-2">
          {deck.map((emoji, i) => {
            const faceUp = open.includes(i) || matched.includes(i);
            return (
              <button
                key={i}
                type="button"
                onPointerDown={() => flip(i)}
                className={`aspect-square rounded-xl text-3xl sm:text-4xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  matched.includes(i)
                    ? "bg-emerald-100 border-2 border-emerald-300"
                    : faceUp
                      ? "bg-white border-2 border-indigo-400 shadow"
                      : "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white/70 shadow-inner"
                }`}
              >
                {faceUp ? emoji : "?"}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">
          {matched.length === deck.length ? "🎉 Semua kartu cocok!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
      )}

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
