"use client";

// =====================================================
// PetunjukRace — Tebak Petunjuk (multiplayer)
//
// 8 objek rahasia (dipilih host, sama untuk semua pemain). Tiap objek
// punya 3 petunjuk satu kata yang terbuka bertahap. Menebak lebih awal
// = poin lebih besar. Skor disiarkan langsung tiap ronde selesai.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  PETUNJUK_BANK,
  PETUNJUK_REVEAL_MS,
  PETUNJUK_ROUNDS,
  PETUNJUK_ROUND_MS,
  isPetunjukCorrect,
  petunjukPoints,
} from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useDelay, useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
type RoundStatus = "guessing" | "right" | "timeout";

const COUNTDOWN = 3;
const NEXT_MS = 2000;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function PetunjukRace({
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
  const picks = config.petunjuk ?? [];
  const joined = config.players;
  const delay = useDelay();

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState<RoundStatus>("guessing");
  const [elapsed, setElapsed] = useState(0);
  const [input, setInput] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [gained, setGained] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);

  const roundStart = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const item = PETUNJUK_BANK[picks[round]];
  const cluesShown = Math.min(3, 1 + Math.floor(elapsed / PETUNJUK_REVEAL_MS));

  const finish = (n: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n, done: true });
  };

  const goNext = (i: number) => {
    if (i + 1 >= PETUNJUK_ROUNDS) {
      finish(i + 1);
      return;
    }
    roundStart.current = nowMs();
    setRound(i + 1);
    setElapsed(0);
    setInput("");
    setWrongGuesses([]);
    setGained(0);
    setStatus("guessing");
  };

  useInterval(
    () => {
      if (count <= 1) {
        roundStart.current = nowMs();
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const ms = nowMs() - roundStart.current;
      if (ms >= PETUNJUK_ROUND_MS) {
        setElapsed(PETUNJUK_ROUND_MS);
        setStatus("timeout");
        const i = round;
        delay(() => goNext(i), NEXT_MS);
      } else setElapsed(ms);
    },
    stage === "play" && status === "guessing" ? 100 : null,
  );

  const submit = () => {
    if (stage !== "play" || status !== "guessing" || !item) return;
    const text = input.trim();
    if (!text) return;
    if (isPetunjukCorrect(text, item)) {
      const shown = Math.min(3, 1 + Math.floor((nowMs() - roundStart.current) / PETUNJUK_REVEAL_MS));
      const pts = petunjukPoints(shown, wrongGuesses.length);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setGained(pts);
      setSolvedCount((n) => n + 1);
      setStatus("right");
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: round + 1 });
      const i = round;
      delay(() => goNext(i), NEXT_MS);
    } else {
      setWrongGuesses((w) => [...w, text]);
      setInput("");
      setShake(true);
      setTimeout(() => setShake(false), 350);
    }
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Berani menebak di petunjuk pertama = poin paling besar."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.petunjuk.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tebak Petunjuk</h3>
        <p className="mt-1 text-sm text-slate-500">3 petunjuk satu kata, satu objek rahasia. Tebak secepatnya!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">
          🏁 Selesai! {solvedCount}/{PETUNJUK_ROUNDS} objek tertebak. Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const roundLeft = Math.max(0, 1 - elapsed / PETUNJUK_ROUND_MS);
  const nextIn = cluesShown < 3 ? Math.ceil((PETUNJUK_REVEAL_MS * cluesShown - elapsed) / 1000) : null;

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Objek {round + 1}/{PETUNJUK_ROUNDS}
        </span>
        <span className="text-slate-500">
          Nilai sekarang:{" "}
          <span className="font-black text-indigo-600">{petunjukPoints(cluesShown, wrongGuesses.length)}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            roundLeft < 0.25 ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-indigo-500"
          }`}
          style={{ width: `${roundLeft * 100}%` }}
        />
      </div>

      <div className="mt-3 space-y-2">
        {item?.clues.map((clue, i) => {
          const open = i < cluesShown || status !== "guessing";
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition ${
                open ? "border-indigo-200 bg-white" : "border-dashed border-slate-200 bg-slate-50"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  open ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              {open ? (
                <span className="text-xl font-black text-slate-900 animate-lb-pop">{clue}</span>
              ) : (
                <span className="text-sm font-semibold text-slate-400">
                  {i === cluesShown && nextIn !== null ? `Terbuka dalam ${nextIn} detik…` : "🔒 Terkunci"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {status === "guessing" ? (
        <form
          className={`mt-3 flex gap-2 ${shake ? "animate-pulse" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik tebakanmu…"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            className={`min-w-0 flex-1 rounded-xl border-2 bg-white px-4 py-3 text-lg font-bold text-slate-900 outline-none focus:border-indigo-500 ${
              shake ? "border-red-400" : "border-slate-200"
            }`}
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 active:scale-95"
          >
            Tebak
          </button>
        </form>
      ) : (
        <div
          className={`mt-3 rounded-xl px-4 py-3 text-center font-black ${
            status === "right" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {status === "right" ? `🎉 Benar! ${item?.answer} +${gained}` : `⏱ Waktu habis! Jawabannya: ${item?.answer}`}
        </div>
      )}

      {wrongGuesses.length > 0 && status === "guessing" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {wrongGuesses.map((g, i) => (
            <span key={i} className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-500 line-through">
              {g}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
