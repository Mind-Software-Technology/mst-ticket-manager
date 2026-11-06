"use client";

// =====================================================
// HartaRace — Cari Harta (multiplayer)
//
// Peta 6x6 dibuat host, sama untuk semua pemain. Tiap pemain membuka
// kotaknya sendiri: permata +40, emas +100, bom -40. Kotak kosong
// menampilkan jumlah permata/emas di sekitarnya.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { HARTA_POINTS, HARTA_SECONDS, HARTA_SIZE, hartaNear } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const nowMs = () => Date.now();
const ICON = ["", "💎", "💣", "🪙"];

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function HartaRace({
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
  const grid = config.harta ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [opened, setOpened] = useState<boolean[]>(() => Array(HARTA_SIZE * HARTA_SIZE).fill(false));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(HARTA_SECONDS);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const openedRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: openedRef.current, done: true });
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
      if (ms >= HARTA_SECONDS * 1000) {
        setTimeLeft(0);
        finish();
      } else setTimeLeft(HARTA_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const dig = (i: number) => {
    if (stage !== "play" || opened[i]) return;
    openedRef.current += 1;
    scoreRef.current = Math.max(0, scoreRef.current + HARTA_POINTS[grid[i] as 0 | 1 | 2 | 3]);
    setScore(scoreRef.current);
    setOpened((o) => o.map((v, k) => (k === i ? true : v)));
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: openedRef.current });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Angka petunjuk = jumlah permata/emas di 8 kotak sekitarnya."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.harta.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Cari Harta</h3>
        <p className="mt-1 text-sm text-slate-500">Gali permata dan emas, hindari bom!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">⏱ Waktu habis! Menunggu pemain lain…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xs mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Skor {score}</span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 rounded-2xl bg-amber-900/80 p-2">
        {grid.map((v, i) => (
          <button
            key={i}
            type="button"
            disabled={opened[i]}
            aria-label={`Kotak ${i + 1}`}
            onPointerDown={() => dig(i)}
            className={`aspect-square rounded-lg text-xl font-black transition ${
              opened[i] ? "bg-amber-100" : "bg-amber-600 hover:bg-amber-500 active:scale-90"
            }`}
          >
            {opened[i] ? (v === 0 ? <span className="text-sm text-slate-500">{hartaNear(grid, i) || ""}</span> : ICON[v]) : ""}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
