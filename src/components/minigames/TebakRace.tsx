"use client";

// =====================================================
// TebakRace — Tebak Angka (multiplayer)
//
// Angka rahasia dibuat host, jadi sama untuk semua pemain. Tiap pemain
// menebak sendiri-sendiri; skor disiarkan langsung tiap ronde selesai.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { TEBAK_MAX_GUESSES, TEBAK_ROUNDS, TEBAK_SECONDS, tebakScore } from "@/lib/mp-content";
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

export function TebakRace({
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
  const secrets = config.tebak ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [allDone, setAllDone] = useState(false);
  /** null = ronde berjalan, true = benar, false = kehabisan tebakan. */
  const [roundWon, setRoundWon] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(TEBAK_SECONDS);

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const secret = secrets[round] ?? 0;

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
      if (ms >= TEBAK_SECONDS * 1000) {
        setTimeLeft(0);
        finish(round);
      } else setTimeLeft(TEBAK_SECONDS - ms / 1000);
    },
    stage === "play" ? 250 : null,
  );

  const guess = () => {
    const n = Number(input);
    if (stage !== "play" || roundWon !== null || !Number.isInteger(n) || n < 1 || n > 100) return;
    const next = [...guesses, n];
    setGuesses(next);
    setInput("");
    if (n === secret) {
      scoreRef.current += tebakScore(next.length);
      setScore(scoreRef.current);
      setRoundWon(true);
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: round + 1 });
    } else if (next.length >= TEBAK_MAX_GUESSES) {
      setRoundWon(false);
    }
  };

  const advance = () => {
    if (round + 1 >= TEBAK_ROUNDS) {
      setAllDone(true);
      finish(round + 1);
      return;
    }
    setRound(round + 1);
    setGuesses([]);
    setInput("");
    setRoundWon(null);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Trik: selalu tebak bagian tengah supaya hemat tebakan."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.tebak.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tebak Angka</h3>
        <p className="mt-1 text-sm text-slate-500">Angka rahasia sama untuk semua. Hemat tebakan = poin besar!</p>
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
          {allDone ? "🏁 Semua angka beres!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const left = TEBAK_MAX_GUESSES - guesses.length;
  const last = guesses[guesses.length - 1];

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Angka {round + 1}/{TEBAK_ROUNDS}
        </span>
        <span className={timeLeft < 15 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <div className="rounded-2xl bg-white border-2 border-slate-200 px-4 py-5 text-center">
        <div className="text-4xl">{roundWon === true ? "🎉" : roundWon === false ? "😵" : "🔮"}</div>
        <p className="mt-2 text-sm font-bold text-slate-500">
          {roundWon === true
            ? `Benar! Angkanya ${secret}.`
            : roundWon === false
              ? `Kehabisan tebakan. Angkanya ${secret}.`
              : last === undefined
                ? "Tebak angka 1-100…"
                : last > secret
                  ? `${last} terlalu BESAR ⬇️`
                  : `${last} terlalu KECIL ⬆️`}
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-label={`Sisa ${left} tebakan`}>
          {Array.from({ length: TEBAK_MAX_GUESSES }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < left ? "bg-indigo-500" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      {roundWon === null ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            guess();
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="1 - 100"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-center text-xl font-black text-slate-900 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 active:scale-95"
          >
            Tebak
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={advance}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 active:scale-95"
        >
          {round + 1 >= TEBAK_ROUNDS ? "Selesai 🏁" : "Angka Berikutnya ➡️"}
        </button>
      )}

      {guesses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {guesses.map((g, i) => (
            <span
              key={i}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                g === secret ? "bg-emerald-100 text-emerald-700" : g > secret ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              {g} {g === secret ? "✓" : g > secret ? "↓" : "↑"}
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
