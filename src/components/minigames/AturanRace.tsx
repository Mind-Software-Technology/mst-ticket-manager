"use client";

// =====================================================
// AturanRace — Aturan Berubah (multiplayer)
//
// Angka dan aturan penggolongannya sama untuk semua pemain; aturan
// berganti tiap 6 angka. Benar +10, salah -5.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { ATURAN_PER_RULE, ATURAN_RULES, ATURAN_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function AturanRace({
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
  const items = config.aturan ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [timeLeft, setTimeLeft] = useState(ATURAN_SECONDS);

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
      if (ms >= ATURAN_SECONDS * 1000) {
        setTimeLeft(0);
        finish(idx);
      } else setTimeLeft(ATURAN_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  const answer = (left: boolean) => {
    if (stage !== "play") return;
    const item = items[idx];
    if (!item) return finish(idx);
    const rule = ATURAN_RULES[item[1]];
    const ok = rule.test(item[0]) === left;
    scoreRef.current = Math.max(0, scoreRef.current + (ok ? 10 : -5));
    setScore(scoreRef.current);
    setFlash(ok ? "ok" : "bad");
    setTimeout(() => setFlash(null), 150);
    setIdx(idx + 1);
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: idx + 1 });
  };

  useEffect(() => {
    if (stage !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") answer(true);
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Selalu baca judul aturan sebelum menjawab!"
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.aturan.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Aturan Berubah</h3>
        <p className="mt-1 text-sm text-slate-500">Aturannya berganti terus — jangan sampai salah!</p>
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

  const item = items[idx] ?? items[items.length - 1] ?? [0, 0];
  const rule = ATURAN_RULES[item[1]];
  const inGroup = (idx % ATURAN_PER_RULE) + 1;

  return (
    <div className="max-w-xs mx-auto select-none text-center">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">Skor {score}</span>
        <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-black text-white">
        {rule.title} <span className="font-semibold opacity-70">({inGroup}/{ATURAN_PER_RULE})</span>
      </div>
      <div
        className={`mt-3 rounded-2xl border-2 py-8 text-7xl font-black transition-colors ${
          flash === "ok"
            ? "border-emerald-400 bg-emerald-50 text-emerald-600"
            : flash === "bad"
              ? "border-red-400 bg-red-50 text-red-600"
              : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {item[0]}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onPointerDown={() => answer(true)} className="py-4 rounded-xl bg-sky-500 text-white font-black active:scale-95">
          {rule.left}
        </button>
        <button type="button" onPointerDown={() => answer(false)} className="py-4 rounded-xl bg-fuchsia-500 text-white font-black active:scale-95">
          {rule.right}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Keyboard: F / ← kiri, J / → kanan</p>
      <div className="mt-3 text-left">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
