"use client";

// =====================================================
// BidikRace — Bidik Cepat (multiplayer)
//
// Jadwal target (posisi, waktu muncul, jenis) dibuat host, jadi semua
// pemain melihat target yang sama. Tap target sebelum hilang; makin
// cepat makin besar poinnya. Skor disiarkan langsung tiap tap.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { BIDIK_SECONDS, bidikPoints } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function BidikRace({
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
  const schedule = config.bidik ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [tapped, setTapped] = useState<ReadonlySet<number>>(new Set());
  const [pop, setPop] = useState<{ id: number; x: number; y: number; pts: number } | null>(null);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const hits = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: hits.current, done: true });
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
      if (ms >= BIDIK_SECONDS * 1000) {
        setElapsed(BIDIK_SECONDS * 1000);
        finish();
      } else setElapsed(ms);
    },
    stage === "play" ? 50 : null,
  );

  const hit = (idx: number) => {
    const t = schedule[idx];
    if (!t || stage !== "play" || tapped.has(idx)) return;
    const [at, x, y, life, kind] = t;
    const remaining = 1 - (nowMs() - startRef.current - at) / life;
    const pts = bidikPoints(kind, remaining);
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    hits.current += 1;
    setScore(scoreRef.current);
    setTapped((prev) => new Set(prev).add(idx));
    setPop({ id: idx, x, y, pts });
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: hits.current });
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Tap lebih cepat saat target baru muncul untuk poin lebih besar."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.bidik.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Bidik Cepat</h3>
        <p className="mt-1 text-sm text-slate-500">Tap 🎯 dan ⭐ secepatnya, hindari 💣!</p>
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

  const left = Math.max(0, BIDIK_SECONDS - elapsed / 1000);

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={left < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(left)}s</span>
      </div>

      <div className="relative aspect-[4/3] w-full touch-none overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50">
        {schedule.map(([at, x, y, life, kind], idx) => {
          if (tapped.has(idx) || elapsed < at || elapsed >= at + life) return null;
          const remaining = 1 - (elapsed - at) / life;
          return (
            <button
              key={idx}
              type="button"
              aria-label={kind === 2 ? "Bom" : kind === 1 ? "Target emas" : "Target"}
              onPointerDown={() => hit(idx)}
              className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-2xl shadow-lg ring-4 active:scale-90 ${
                kind === 2
                  ? "bg-slate-800 ring-red-300"
                  : kind === 1
                    ? "bg-gradient-to-br from-yellow-300 to-amber-500 ring-amber-200"
                    : "bg-gradient-to-br from-fuchsia-500 to-indigo-600 ring-indigo-200"
              }`}
              style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${0.6 + remaining * 0.4})`, opacity: 0.45 + remaining * 0.55 }}
            >
              {kind === 2 ? "💣" : kind === 1 ? "⭐" : "🎯"}
            </button>
          );
        })}
        {pop && (
          <span
            key={pop.id}
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-lg font-black animate-lb-pop ${
              pop.pts > 0 ? "text-emerald-600" : "text-red-600"
            }`}
            style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
          >
            {pop.pts > 0 ? `+${pop.pts}` : pop.pts}
          </span>
        )}
      </div>

      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
