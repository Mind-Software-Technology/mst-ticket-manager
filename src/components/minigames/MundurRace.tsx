"use client";

// =====================================================
// MundurRace — Urutan Mundur (multiplayer)
//
// Urutan hewan tiap ronde dibuat host, sama untuk semua pemain. Tap hewan
// dari yang TERAKHIR ke yang pertama. Benar +10, ronde beres +20.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "show" | "input" | "feedback" | "done";
const COUNTDOWN = 3;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function MundurRace({
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
  const rounds = config.mundur ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(0);
  const [step, setStep] = useState(0);
  const [ok, setOk] = useState(true);
  const [score, setScore] = useState(0);

  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const beginRound = (r: number) => {
    setRound(r);
    setShown(0);
    setStep(0);
    setStage("show");
  };

  const endRound = (good: boolean) => {
    setOk(good);
    setStage("feedback");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: round + 1 });
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
        if (shown < (rounds[round]?.[0].length ?? 0)) setShown((n) => n + 1);
        else setStage("input");
        return;
      }
      if (stage === "feedback") {
        if (round + 1 >= rounds.length) {
          if (!doneSent.current) {
            doneSent.current = true;
            setStage("done");
            room.send({ t: "prog", id: me.id, score: scoreRef.current, n: rounds.length, done: true });
          }
        } else beginRound(round + 1);
      }
    },
    stage === "show" ? 700 : stage === "feedback" ? 1100 : null,
  );

  const pick = (emoji: string) => {
    if (stage !== "input") return;
    const seq = rounds[round][0];
    if (emoji !== seq[seq.length - 1 - step]) {
      endRound(false);
      return;
    }
    const last = step + 1 === seq.length;
    scoreRef.current += 10 + (last ? 20 : 0);
    setScore(scoreRef.current);
    if (last) endRound(true);
    else setStep(step + 1);
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Ulangi urutannya dari belakang dalam hati selagi hewan ditampilkan."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.mundur.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Urutan Mundur</h3>
        <p className="mt-1 text-sm text-slate-500">Hafalkan urutannya, tap dari yang terakhir!</p>
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

  const [seq, pool] = rounds[round];
  return (
    <div className="max-w-sm mx-auto select-none text-center">
      <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
        <span>
          Ronde {round + 1}/{rounds.length}
        </span>
        <span className="text-indigo-600">Skor {score}</span>
      </div>
      <div className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 p-3 text-4xl">
        {stage === "show" && seq.slice(0, shown).map((e, i) => <span key={i} className="animate-lb-pop">{e}</span>)}
        {stage === "input" &&
          seq.map((_, i) => (
            <span key={i} className={i < step ? "" : "opacity-30"}>
              {i < step ? seq[seq.length - 1 - i] : "❔"}
            </span>
          ))}
        {stage === "feedback" && (
          <span className="text-2xl font-black">{ok ? "Sempurna! 🎉" : `Salah 😅 (${[...seq].reverse().join(" ")})`}</span>
        )}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-600">
        {stage === "show" ? "Hafalkan urutannya…" : stage === "input" ? "Tap dari yang TERAKHIR!" : ""}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {pool.map((e) => (
          <button
            key={e}
            type="button"
            disabled={stage !== "input"}
            onPointerDown={() => pick(e)}
            className="py-3 rounded-xl bg-white border border-slate-200 text-3xl active:scale-90 disabled:opacity-50"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="mt-3 text-left">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
