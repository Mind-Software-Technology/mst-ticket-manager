"use client";

// =====================================================
// SimonRace — Pola Ajaib (multiplayer)
//
// Pola pad dibuat host, jadi semua pemain mendapat urutan yang sama.
// Tiap pemain main sendiri; skor = level yang lolos x 100, disiarkan
// langsung. Salah / kehabisan waktu = selesai.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";

type Phase = "intro" | "show" | "input" | "gap" | "over";

const STEP_MS = 650;
const LIT_MS = 400;
const INTRO_MS = 2500;
const PADS = [
  { on: "bg-red-500", off: "bg-red-200", label: "🔴" },
  { on: "bg-sky-500", off: "bg-sky-200", label: "🔵" },
  { on: "bg-emerald-500", off: "bg-emerald-200", label: "🟢" },
  { on: "bg-amber-400", off: "bg-amber-100", label: "🟡" },
];

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function SimonRace({
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
  const pattern = config.pattern ?? [];
  const joined = config.players;

  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1);
  const [lit, setLit] = useState<number | null>(null);
  const [entered, setEntered] = useState(0);
  const [score, setScore] = useState(0);

  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const enteredRef = useRef(0);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, phase === "over");

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

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const gameOver = () => {
    clearTimers();
    setLit(null);
    setPhaseBoth("over");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: level, done: true });
  };

  const showLevel = (lv: number) => {
    setLevel(lv);
    enteredRef.current = 0;
    setEntered(0);
    setPhaseBoth("show");
    for (let i = 0; i < lv; i++) {
      later(() => setLit(pattern[i]), 500 + i * STEP_MS);
      later(() => setLit(null), 500 + i * STEP_MS + LIT_MS);
    }
    later(() => {
      setPhaseBoth("input");
      // Waktu mengulang: 5 detik + 1 detik per langkah.
      later(gameOver, (5 + lv) * 1000);
    }, 500 + lv * STEP_MS);
  };

  useEffect(() => {
    later(() => showLevel(1), INTRO_MS);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = (pad: number) => {
    if (phaseRef.current !== "input") return;
    setLit(pad);
    later(() => setLit(null), 150);

    if (pattern[enteredRef.current] !== pad) {
      gameOver();
      return;
    }
    enteredRef.current += 1;
    setEntered(enteredRef.current);
    if (enteredRef.current >= level) {
      clearTimers();
      scoreRef.current += 100;
      setScore(scoreRef.current);
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: level });
      setPhaseBoth("gap");
      later(() => showLevel(level + 1), 900);
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

  if (phase === "intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.simon.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Pola Ajaib</h3>
        <p className="mt-1 text-sm text-slate-500">Perhatikan urutan yang menyala, lalu ulangi!</p>
      </div>
    );
  }

  const status =
    phase === "show"
      ? "👀 Perhatikan polanya…"
      : phase === "input"
        ? `👆 Giliranmu! ${entered}/${level}`
        : phase === "gap"
          ? "✅ Benar! Level berikutnya…"
          : "💥 Selesai! Menunggu pemain lain…";

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Level {level}</span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PADS.map((p, i) => (
          <button
            key={i}
            type="button"
            disabled={phase !== "input"}
            onPointerDown={() => press(i)}
            className={`aspect-square rounded-2xl text-4xl transition-all duration-100 active:scale-95 ${
              lit === i ? `${p.on} scale-105 shadow-xl ring-4 ring-white` : p.off
            }`}
            aria-label={`Pad ${i + 1}`}
          >
            {lit === i ? p.label : ""}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-slate-600">{status}</p>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
