"use client";

// =====================================================
// DaduRace — Dadu Berani (multiplayer)
//
// Urutan lemparan dadu tiap ronde dibuat host, jadi sama untuk semua
// pemain: yang membedakan hanya nyali kapan berhenti. Angka 1 menghanguskan
// poin giliran. Skor disiarkan tiap ronde selesai.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { DADU_ROUNDS, DADU_ROUND_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useDelay, useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
type Phase = "roll" | "result";
type Outcome = "bust" | "hold" | "timeout";

const COUNTDOWN = 3;
const RESULT_MS = 1800;
const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function DaduRace({
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
  const rolls = config.dadu ?? [];
  const joined = config.players;
  const delay = useDelay();

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("roll");
  const [rollIdx, setRollIdx] = useState(0);
  const [turnTotal, setTurnTotal] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome>("hold");
  const [roundGain, setRoundGain] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DADU_ROUND_SECONDS);

  const roundStart = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);
  /** Token ronde: timer lama yang sudah tidak relevan diabaikan. */
  const token = useRef(0);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = (n: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n, done: true });
  };

  const startRound = (i: number) => {
    token.current += 1;
    roundStart.current = nowMs();
    setRound(i);
    setPhase("roll");
    setRollIdx(0);
    setTurnTotal(0);
    setLastRoll(null);
    setTimeLeft(DADU_ROUND_SECONDS);
  };

  const endRound = (i: number, kind: Outcome, banked: number) => {
    token.current += 1;
    const mine = token.current;
    scoreRef.current += banked;
    setScore(scoreRef.current);
    setOutcome(kind);
    setRoundGain(banked);
    setPhase("result");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: i + 1 });
    delay(() => {
      if (token.current !== mine) return;
      if (i + 1 >= DADU_ROUNDS) finish(i + 1);
      else startRound(i + 1);
    }, RESULT_MS);
  };

  useInterval(
    () => {
      if (count <= 1) {
        startRound(0);
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const left = DADU_ROUND_SECONDS - (nowMs() - roundStart.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        endRound(round, "timeout", turnTotal);
      } else setTimeLeft(left);
    },
    stage === "play" && phase === "roll" ? 100 : null,
  );

  const roll = () => {
    if (stage !== "play" || phase !== "roll") return;
    const seq = rolls[round] ?? [];
    const d = seq[rollIdx] ?? 1;
    setLastRoll(d);
    if (d === 1) {
      endRound(round, "bust", 0);
      return;
    }
    const total = turnTotal + d;
    setTurnTotal(total);
    setRollIdx(rollIdx + 1);
    // Kehabisan lemparan: otomatis disimpan.
    if (rollIdx + 1 >= seq.length) endRound(round, "hold", total);
  };

  const hold = () => {
    if (stage !== "play" || phase !== "roll" || turnTotal === 0) return;
    endRound(round, "hold", turnTotal);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Tahu kapan berhenti sama pentingnya dengan berani melempar."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.dadu.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Dadu Berani</h3>
        <p className="mt-1 text-sm text-slate-500">Lempar terus untuk menumpuk poin, tapi awas angka 1!</p>
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

  const busted = phase === "result" && outcome === "bust";

  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Ronde {round + 1}/{DADU_ROUNDS}
        </span>
        <span className="text-slate-900">
          Tersimpan <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 5 && phase === "roll" ? "text-red-500 animate-pulse" : "text-slate-500"}>
          ⏱ {Math.ceil(timeLeft)}s
        </span>
      </div>

      <div className={`rounded-2xl px-4 py-6 text-white transition-colors ${busted ? "bg-red-600" : "bg-slate-800"}`}>
        <div className={`text-8xl leading-none ${lastRoll !== null ? "animate-lb-pop" : "opacity-30"}`} key={`${round}-${rollIdx}-${lastRoll}`}>
          {lastRoll !== null ? FACES[lastRoll - 1] : "🎲"}
        </div>
        <p className="mt-3 text-xs font-bold text-slate-300">Poin giliran ini</p>
        <p className={`text-5xl font-black ${busted ? "line-through opacity-60" : "text-yellow-300"}`}>{turnTotal}</p>
        <p className="mt-2 h-5 text-sm font-bold">
          {phase === "result"
            ? outcome === "bust"
              ? "💥 Keluar angka 1! Poin giliran hangus."
              : `✅ Disimpan +${roundGain}`
            : "Angka 1 = semua poin giliran hangus"}
        </p>
      </div>

      {phase === "roll" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onPointerDown={roll}
            className="h-20 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-xl font-black text-white shadow-lg transition active:scale-95"
          >
            LEMPAR 🎲
          </button>
          <button
            type="button"
            onPointerDown={hold}
            disabled={turnTotal === 0}
            className="h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-black text-white shadow-lg transition active:scale-95 disabled:opacity-40"
          >
            SIMPAN 💰
          </button>
        </div>
      ) : (
        <div className="mt-4 h-20" />
      )}

      <div className="mt-4 text-left">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
