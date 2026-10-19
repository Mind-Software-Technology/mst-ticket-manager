"use client";

// =====================================================
// QuizBattle — Kuis Kilat & Rebutan (multiplayer)
//
// Host mengatur giliran: kirim `round`, kumpulkan jawaban, kirim
// `reveal` berisi semua jawaban. Setiap klien menghitung skor dari
// data reveal yang sama, jadi papan skor selalu seragam.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { kindTitle, scoreRound, ROUND_MS, MP_MODES, type MpMessage, type MpPlayer, type RoundAnswers, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "intro" | "question" | "reveal" | "done";

const INTRO_MS = 3000;
const REVEAL_MS = 4500;
const GRACE_MS = 2000;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function QuizBattle({
  room,
  me,
  config,
  onLobby,
  onLeave,
}: {
  room: RoomApi;
  me: MpPlayer;
  config: StartPayload;
  /** Dipanggil host untuk membawa semua orang kembali ke lobi. */
  onLobby: () => void;
  onLeave: () => void;
}) {
  const questions = config.questions ?? [];
  const mode = config.mode === "rebutan" ? "rebutan" : "quiz";
  const isHost = config.hostId === me.id;
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("intro");
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [gain, setGain] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<RoundAnswers>({});
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [aborted, setAborted] = useState(false);

  const roundStart = useRef(0);
  const hostAnswers = useRef<Record<number, RoundAnswers>>({});
  const hostRevealed = useRef<Set<number>>(new Set());
  const scored = useRef<Set<number>>(new Set());
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const presentRef = useRef<string[]>([]);
  const handler = useRef<(m: MpMessage) => void>(() => {});

  useEffect(() => {
    presentRef.current = room.players.map((p) => p.id);
  });

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const hostReveal = (i: number) => {
    if (hostRevealed.current.has(i)) return;
    hostRevealed.current.add(i);
    room.send({ t: "reveal", i, answers: hostAnswers.current[i] ?? {} });
    later(() => {
      if (i + 1 < questions.length) room.send({ t: "round", i: i + 1 });
      else room.send({ t: "end" });
    }, REVEAL_MS);
  };

  useEffect(() => {
    handler.current = (m) => {
      switch (m.t) {
        case "round":
          setIdx(m.i);
          setChoice(null);
          setStage("question");
          setTimeLeft(ROUND_MS);
          roundStart.current = Date.now();
          if (isHost) later(() => hostReveal(m.i), ROUND_MS + GRACE_MS);
          break;
        case "ans": {
          if (!isHost) break;
          const bucket = (hostAnswers.current[m.i] ??= {});
          if (!bucket[m.id]) bucket[m.id] = { c: m.c, ms: m.ms };
          const waiting = joined.filter((p) => presentRef.current.includes(p.id));
          if (waiting.every((p) => bucket[p.id])) later(() => hostReveal(m.i), 600);
          break;
        }
        case "reveal": {
          if (scored.current.has(m.i)) break;
          scored.current.add(m.i);
          const pts = scoreRound(questions[m.i], m.answers, mode);
          setGain(Object.fromEntries(joined.map((p) => [p.id, pts[p.id] ?? 0])));
          setRevealed(m.answers);
          setScores((prev) => {
            const next = { ...prev };
            for (const [id, p] of Object.entries(pts)) next[id] = (next[id] ?? 0) + p;
            return next;
          });
          setStage("reveal");
          break;
        }
        case "end":
          setStage("done");
          break;
      }
    };
  });

  useEffect(() => {
    const unsub = room.subscribe((m) => handler.current(m));
    const pending = timers.current;
    if (isHost) later(() => room.send({ t: "round", i: 0 }), INTRO_MS);
    return () => {
      unsub();
      pending.forEach(clearTimeout);
      pending.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host menghilang di tengah permainan → selesai dengan skor saat ini.
  const hostGone = !room.players.some((p) => p.id === config.hostId);
  useEffect(() => {
    if (!hostGone) return;
    const id = setTimeout(() => setAborted(true), 6000);
    return () => clearTimeout(id);
  }, [hostGone]);

  useInterval(
    () => setTimeLeft(Math.max(0, ROUND_MS - (Date.now() - roundStart.current))),
    stage === "question" ? 100 : null,
  );

  const answer = (c: number) => {
    if (stage !== "question" || choice !== null || timeLeft <= 0) return;
    if (!joined.some((p) => p.id === me.id)) return;
    setChoice(c);
    room.send({ t: "ans", i: idx, id: me.id, c, ms: nowMs() - roundStart.current });
  };

  if (stage === "done" || aborted) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={aborted && stage !== "done" ? "Host keluar, permainan dihentikan." : undefined}
        onBack={isHost ? onLobby : undefined}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl animate-lb-float inline-block">{MP_MODES[mode].emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">{MP_MODES[mode].label}</h3>
        <p className="mt-2 text-sm text-slate-500">Bersiap… soal pertama sebentar lagi!</p>
        <p className="mt-4 text-xs text-slate-400">{joined.map((p) => p.name).join(" · ")}</p>
      </div>
    );
  }

  const q = questions[idx];
  const reveal = stage === "reveal";
  const answered = joined.filter((p) => revealed[p.id]).length;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>
          Soal {idx + 1}/{questions.length}
        </span>
        <span>{MP_MODES[mode].emoji} {MP_MODES[mode].label}</span>
        <span className={timeLeft < 4000 && !reveal ? "text-red-500 animate-pulse" : ""}>
          {reveal ? "Jawaban" : `⏱ ${Math.ceil(timeLeft / 1000)}s`}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            timeLeft < 4000 ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-indigo-500"
          }`}
          style={{ width: `${reveal ? 0 : (timeLeft / ROUND_MS) * 100}%` }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <span className="text-xs font-bold text-indigo-500">{kindTitle(q.kind)}</span>
        <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900">{q.prompt}</h3>
        <p className="mt-1 font-mono text-[11px] text-slate-400">{q.hint}</p>
      </div>

      <div className={`mt-3 grid gap-2 ${q.options.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answer;
          const mine = choice === i;
          let cls = "bg-white border-slate-200 text-slate-800 hover:bg-indigo-50 hover:border-indigo-300";
          if (reveal) {
            cls = isAnswer
              ? "bg-emerald-100 border-emerald-400 text-emerald-900"
              : mine
                ? "bg-red-100 border-red-300 text-red-800"
                : "bg-white border-slate-200 text-slate-400";
          } else if (mine) {
            cls = "bg-indigo-600 border-indigo-600 text-white";
          } else if (choice !== null) {
            cls = "bg-white border-slate-200 text-slate-400";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={reveal || choice !== null}
              onClick={() => answer(i)}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs text-slate-400">
        {reveal
          ? `${answered}/${joined.length} pemain menjawab`
          : choice !== null
            ? "Jawabanmu terkunci. Menunggu pemain lain…"
            : "Pilih secepatnya!"}
      </p>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} gain={reveal ? gain : undefined} />
      </div>
    </div>
  );
}
