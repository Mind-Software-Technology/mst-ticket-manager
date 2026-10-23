"use client";

// =====================================================
// SandiRace — Sandi Rahasia (multiplayer, gaya Mastermind)
//
// 3 sandi 4 warna dibuat host, sama untuk semua pemain. Tiap tebakan
// diberi petunjuk: ● warna & posisi pas, ○ warna ada tapi posisi salah.
// Makin sedikit tebakan dan makin cepat, makin besar poin.
// =====================================================

import { useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  SANDI_CODES,
  SANDI_COLORS,
  SANDI_LEN,
  SANDI_MAX_TRIES,
  SANDI_SECONDS,
  sandiPoints,
  scoreSandi,
} from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";
import { SandiHelp } from "./SandiHelp";

type Stage = "countdown" | "play" | "done";
interface Guess {
  g: number[];
  exact: number;
  partial: number;
}

const COUNTDOWN = 3;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function SandiRace({
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
  const codes = config.codes ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [codeIdx, setCodeIdx] = useState(0);
  const [current, setCurrent] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SANDI_SECONDS);
  const [note, setNote] = useState("");

  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: codeIdx, done: true });
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
      const left = SANDI_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish();
      } else setTimeLeft(left);
    },
    stage === "play" ? 200 : null,
  );

  const nextCode = (gain: number, msg: string) => {
    scoreRef.current += gain;
    setScore(scoreRef.current);
    setNote(msg);
    setCurrent([]);
    setGuesses([]);
    if (codeIdx + 1 >= SANDI_CODES) {
      finish();
    } else {
      setCodeIdx(codeIdx + 1);
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: codeIdx + 1 });
    }
  };

  const add = (c: number) => {
    if (stage === "play" && current.length < SANDI_LEN) setCurrent([...current, c]);
  };
  const del = () => setCurrent(current.slice(0, -1));

  const submit = () => {
    const code = codes[codeIdx];
    if (stage !== "play" || !code || current.length !== SANDI_LEN) return;
    const fb = scoreSandi(code, current);
    const tries = guesses.length + 1;
    if (fb.exact === SANDI_LEN) {
      const secondsLeft = SANDI_SECONDS - (nowMs() - startRef.current) / 1000;
      const pts = sandiPoints(tries, secondsLeft);
      nextCode(pts, `🎉 Sandi terpecahkan dalam ${tries} tebakan! +${pts}`);
    } else if (tries >= SANDI_MAX_TRIES) {
      nextCode(0, `😵 Gagal! Sandinya: ${code.map((c) => SANDI_COLORS[c]).join(" ")}`);
    } else {
      setGuesses([...guesses, { g: current, ...fb }]);
      setCurrent([]);
      setNote("");
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

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.sandi.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Sandi Rahasia</h3>
        <p className="mt-1 text-sm text-slate-500">Tebak 4 warna rahasia berurutan. ● = warna & posisi benar, ○ = warna benar tapi posisi salah.</p>
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
          {codeIdx + 1 >= SANDI_CODES ? "🏁 Semua sandi selesai!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        {note && <p className="mt-1 text-sm text-slate-500">{note}</p>}
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const slots = Array.from({ length: SANDI_LEN }, (_, i) => current[i]);

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Sandi {codeIdx + 1}/{SANDI_CODES} · tebakan {guesses.length + 1}/{SANDI_MAX_TRIES}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 30 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      {note && <p className="mb-2 rounded-lg bg-slate-100 px-3 py-1.5 text-center text-xs font-bold text-slate-600">{note}</p>}

      <div className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
        {guesses.length === 0 && <p className="py-3 text-center text-xs text-slate-400">Belum ada tebakan. Mulai dari tebakan pertamamu!</p>}
        {guesses.map((gs, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5">
            <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
            <span className="flex-1 text-xl tracking-wider">{gs.g.map((c) => SANDI_COLORS[c]).join(" ")}</span>
            <span className="text-sm font-black text-slate-700">
              {"●".repeat(gs.exact)}
              <span className="text-slate-400">{"○".repeat(gs.partial)}</span>
              {gs.exact + gs.partial === 0 && <span className="text-xs text-slate-300">kosong</span>}
            </span>
          </div>
        ))}
      </div>

      <SandiHelp />

      <div className="mt-3 flex items-center justify-center gap-2">
        {slots.map((c, i) => (
          <div
            key={i}
            className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl ${
              c === undefined ? "border-dashed border-slate-300 bg-white" : "border-indigo-300 bg-indigo-50"
            }`}
          >
            {c === undefined ? "" : SANDI_COLORS[c]}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2">
        {SANDI_COLORS.map((emoji, c) => (
          <button
            key={emoji}
            type="button"
            onClick={() => add(c)}
            className="aspect-square rounded-xl border border-slate-200 bg-white text-2xl shadow-sm transition active:scale-90 hover:bg-slate-50"
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={del}
          disabled={current.length === 0}
          className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 disabled:opacity-40"
        >
          ⌫ Hapus
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={current.length !== SANDI_LEN}
          className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 py-2.5 text-sm font-black text-white shadow disabled:opacity-40"
        >
          Tebak ✔
        </button>
      </div>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
