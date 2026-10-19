"use client";

// =====================================================
// TypeRace — Balapan Ketik (multiplayer)
//
// Semua pemain dapat antrean tiket yang sama dan mengetik ID-nya.
// Setiap jawaban benar menyiarkan skor, jadi lintasan balapan semua
// pemain bergerak langsung. Tidak perlu host mengatur ronde.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { PRIORITY_DOT } from "@/lib/minigame";
import { avatarFor, MP_MODES, RACE_SECONDS, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const FINAL_WAIT_MS = 6000;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

interface Progress {
  score: number;
  n: number;
  done: boolean;
}

export function TypeRace({
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
  const queue = config.queue ?? [];
  const joined = config.players;
  const isHost = config.hostId === me.id;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [timeLeft, setTimeLeft] = useState(RACE_SECONDS);
  const [pos, setPos] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [shake, setShake] = useState(false);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [finalized, setFinalized] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef(0);
  const doneSent = useRef(false);

  useEffect(() => {
    return room.subscribe((m) => {
      if (m.t === "prog") {
        setProgress((prev) => ({ ...prev, [m.id]: { score: m.score, n: m.n, done: !!m.done } }));
      }
    });
  }, [room]);

  // Hitung mundur lokal, lalu mulai.
  useInterval(
    () => {
      if (count <= 1) {
        endRef.current = Date.now() + RACE_SECONDS * 1000;
        setStage("play");
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setCount((c) => c - 1);
      }
    },
    stage === "countdown" ? 1000 : null,
  );

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setTimeLeft(0);
    setStage("done");
    room.send({ t: "prog", id: me.id, score, n: pos, done: true });
  };

  useInterval(
    () => {
      const left = (endRef.current - Date.now()) / 1000;
      if (left <= 0) finish();
      else setTimeLeft(left);
    },
    stage === "play" ? 100 : null,
  );

  // Kunci hasil akhir: semua selesai, atau batas tunggu setelah selesai sendiri.
  const allDone = joined.every((p) => p.id === me.id ? stage === "done" : progress[p.id]?.done);
  useEffect(() => {
    if (stage !== "done") return;
    if (allDone) {
      const id = setTimeout(() => setFinalized(true), 800);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setFinalized(true), FINAL_WAIT_MS);
    return () => clearTimeout(id);
  }, [stage, allDone]);

  const onChange = (raw: string) => {
    if (stage !== "play") return;
    const value = raw.toUpperCase();
    const t = queue[pos];
    if (!t) return;
    const target = t.ticket_id.toUpperCase();

    if (value === target) {
      const gained = 100 + Math.min(combo, 10) * 10;
      const next = score + gained;
      setScore(next);
      setCombo((c) => c + 1);
      setPos((p) => p + 1);
      setInput("");
      room.send({ t: "prog", id: me.id, score: next, n: pos + 1 });
    } else if (value.length >= target.length) {
      // Salah ketik: kombo putus, ulangi tiket yang sama.
      setCombo(0);
      setInput("");
      setShake(true);
      setTimeout(() => setShake(false), 300);
    } else {
      setInput(value);
    }
  };

  // Skor tampilan: milik sendiri dari state lokal, lainnya dari siaran.
  const scores: Record<string, number> = {};
  for (const p of joined) scores[p.id] = p.id === me.id ? score : (progress[p.id]?.score ?? 0);
  const counts = (id: string) => `${id === me.id ? pos : (progress[id]?.n ?? 0)} tiket`;

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        onBack={isHost ? onLobby : undefined}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.race.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Balapan Ketik</h3>
        <p className="mt-1 text-sm text-slate-500">Taruh jari di keyboard…</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  const t = queue[pos];
  const tracks = [...joined].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const lead = Math.max(1, ...tracks.map((p) => scores[p.id] ?? 0));

  return (
    <div className="max-w-xl mx-auto">
      {/* Lintasan */}
      <div className="rounded-2xl bg-slate-900 p-3 space-y-1.5">
        {tracks.map((p) => {
          const pct = Math.max(2, ((scores[p.id] ?? 0) / lead) * 92);
          return (
            <div key={p.id} className="relative h-7 rounded-lg bg-slate-800 overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600/40 to-fuchsia-500/40 transition-[width] duration-300" style={{ width: `${pct}%` }} />
              <span
                className="absolute top-0.5 text-base transition-[left] duration-300"
                style={{ left: `calc(${pct}% - 1.25rem)` }}
              >
                {avatarFor(p.id)}
              </span>
              <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-bold text-slate-300">
                {p.id === me.id ? "Kamu" : p.name}
              </span>
              <span className="absolute inset-y-0 right-2 flex items-center text-[11px] font-black text-white">
                {scores[p.id] ?? 0}
              </span>
            </div>
          );
        })}
      </div>

      {stage === "play" && t && (
        <>
          <div className="mt-3 flex items-center justify-between text-sm font-bold">
            <span className="text-slate-900">
              Skor <span className="text-xl font-black text-indigo-600">{score}</span>
            </span>
            <span className={combo >= 2 ? "text-orange-500 scale-110" : "text-slate-300"}>🔥 x{combo}</span>
            <span className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
          </div>

          <div className={`mt-3 rounded-2xl border bg-white p-5 text-center shadow-sm ${shake ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
            <span className="font-mono text-xs font-semibold text-indigo-500">
              {PRIORITY_DOT[t.priority]} Tiket #{pos + 1}
            </span>
            <h3 className="mt-1 text-sm font-semibold text-slate-500 line-clamp-2">{t.subject}</h3>
            <div className="mt-3 text-4xl font-black tracking-wider text-slate-900 select-none">
              {t.ticket_id.split("").map((ch, i) => (
                <span
                  key={i}
                  className={
                    i < input.length
                      ? input[i] === ch.toUpperCase()
                        ? "text-emerald-500"
                        : "text-red-500"
                      : "text-slate-300"
                  }
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ketik ID di atas…"
            className="mt-3 w-full px-4 py-3 text-lg font-mono font-bold text-center border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </>
      )}

      {stage === "done" && (
        <div className="mt-4 text-center">
          <p className="text-lg font-black text-slate-900">⏱ Waktu habis!</p>
          <p className="text-xs text-slate-500">Menunggu pemain lain selesai…</p>
          <div className="mt-3 text-left">
            <Scoreboard players={joined} scores={scores} meId={me.id} suffix={counts} />
          </div>
        </div>
      )}
    </div>
  );
}
