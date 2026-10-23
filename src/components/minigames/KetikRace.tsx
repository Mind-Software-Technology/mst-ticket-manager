"use client";

// =====================================================
// KetikRace — Ketik Kata (multiplayer)
//
// Urutan kata dibuat host, sama untuk semua pemain. Selesaikan kata
// satu per satu secepat mungkin; skor disiarkan langsung tiap kata.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { KETIK_SECONDS, ketikPoints } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { KetikWord } from "./KetikGame";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function KetikRace({
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
  const words = config.typing ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(KETIK_SECONDS);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const dirty = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (stage === "play") inputRef.current?.focus();
  }, [stage]);

  useInterval(
    () => {
      const left = KETIK_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        setStage("done");
        room.send({ t: "prog", id: me.id, score: scoreRef.current, n: idx, done: true });
      } else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  const word = words[idx] ?? "";

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (stage !== "play") return;
    const v = e.target.value.replace(/\s/g, "").toLowerCase();
    if (!word.startsWith(v)) dirty.current = true;
    if (v === word) {
      scoreRef.current += ketikPoints(word, !dirty.current);
      setScore(scoreRef.current);
      setIdx(idx + 1);
      setTyped("");
      dirty.current = false;
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: idx + 1 });
    } else setTyped(v);
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
        <div className="text-6xl">{MP_MODES.ketik.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Ketik Kata</h3>
        <p className="mt-1 text-sm text-slate-500">Ketik kata yang tampil secepat mungkin. Siapkan jarimu!</p>
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
        <span className="text-slate-500">{idx} kata</span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="rounded-2xl border-2 border-slate-200 bg-white py-7 text-center">
        <p className="text-xs font-bold text-slate-400">Ketik kata ini</p>
        <div className="mt-2">
          <KetikWord word={word} typed={typed} />
        </div>
        <p className="mt-2 text-xs text-slate-400">Berikutnya: {words[idx + 1] ?? ""}</p>
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={onChange}
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="off"
        placeholder="Mulai mengetik…"
        className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center font-mono text-xl font-bold focus:border-indigo-500 focus:outline-none"
      />
      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
