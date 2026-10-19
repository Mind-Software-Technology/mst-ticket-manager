"use client";

// =====================================================
// WhackRace — Gebuk Bareng (multiplayer)
//
// Host membuat jadwal kemunculan tiket; semua klien memutar jadwal
// yang sama, jadi semua pemain melihat papan identik. Skor tiap
// pemain disiarkan langsung. Tidak butuh host mengatur ronde.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { PRIORITY_DOT, WHACK_POINTS } from "@/lib/minigame";
import {
  MP_MODES,
  WHACK_HOLES,
  WHACK_SECONDS,
  type MpMessage,
  type MpPlayer,
  type StartPayload,
  type WhackSpawn,
} from "@/lib/multiplayer";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const FINAL_WAIT_MS = 6000;
const HIT_SHOW_MS = 450;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function WhackRace({
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
  const schedule: WhackSpawn[] = config.schedule ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  /** indeks jadwal → { poin, kapan } untuk spawn yang sudah digebuk. */
  const [whacked, setWhacked] = useState<Record<number, { pts: number; at: number }>>({});
  const [progress, setProgress] = useState<Record<string, { score: number; done: boolean }>>({});
  const [finalized, setFinalized] = useState(false);

  const startRef = useRef(0);
  const doneSent = useRef(false);
  const escaped = useRef<Set<number>>(new Set());

  useEffect(() => {
    return room.subscribe((m) => {
      if (m.t === "prog") setProgress((prev) => ({ ...prev, [m.id]: { score: m.score, done: !!m.done } }));
    });
  }, [room]);

  useInterval(
    () => {
      if (count <= 1) {
        startRef.current = nowMs();
        setStage("play");
      } else {
        setCount((c) => c - 1);
      }
    },
    stage === "countdown" ? 1000 : null,
  );

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score, n: hits, done: true });
  };

  useInterval(
    () => {
      const ms = nowMs() - startRef.current;
      if (ms >= WHACK_SECONDS * 1000) {
        setElapsed(WHACK_SECONDS * 1000);
        finish();
        return;
      }
      setElapsed(ms);
      // Tiket yang kabur sebelum digebuk memutus kombo.
      schedule.forEach((s, i) => {
        if (s.kind !== "bomb" && ms >= s.at + s.life && !whacked[i] && !escaped.current.has(i)) {
          escaped.current.add(i);
          setCombo(0);
        }
      });
    },
    stage === "play" ? 50 : null,
  );

  const whack = (i: number) => {
    if (stage !== "play" || whacked[i]) return;
    const s = schedule[i];
    const ms = nowMs() - startRef.current;
    if (!s || ms < s.at || ms >= s.at + s.life) return;

    let pts: number;
    let nextScore: number;
    if (s.kind === "bomb") {
      pts = -5;
      nextScore = Math.max(0, score - 5);
      setCombo(0);
    } else {
      const base = s.kind === "gold" ? 10 : WHACK_POINTS[s.priority];
      pts = base * (1 + Math.floor(combo / 5));
      nextScore = score + pts;
      setCombo((c) => c + 1);
      setHits((n) => n + 1);
    }
    setScore(nextScore);
    setWhacked((prev) => ({ ...prev, [i]: { pts, at: ms } }));
    room.send({ t: "prog", id: me.id, score: nextScore, n: hits + (s.kind === "bomb" ? 0 : 1) });
  };

  const scores: Record<string, number> = {};
  for (const p of joined) scores[p.id] = p.id === me.id ? score : (progress[p.id]?.score ?? 0);

  const allDone = joined.every((p) => (p.id === me.id ? stage === "done" : progress[p.id]?.done));
  useEffect(() => {
    if (stage !== "done") return;
    const id = setTimeout(() => setFinalized(true), allDone ? 800 : FINAL_WAIT_MS);
    return () => clearTimeout(id);
  }, [stage, allDone]);

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
        <div className="text-6xl">{MP_MODES.whack.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Gebuk Bareng</h3>
        <p className="mt-1 text-sm text-slate-500">Siapkan jari… awas 💣 Deploy Jumat Sore!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  // Isi tiap lubang: spawn aktif atau hasil gebukan yang masih ditampilkan.
  const holes: Array<{ i: number; s: WhackSpawn; hit?: number } | null> = Array(WHACK_HOLES).fill(null);
  schedule.forEach((s, i) => {
    const w = whacked[i];
    if (w) {
      if (elapsed - w.at < HIT_SHOW_MS) holes[s.slot] = { i, s, hit: w.pts };
    } else if (elapsed >= s.at && elapsed < s.at + s.life) {
      holes[s.slot] = { i, s };
    }
  });
  const timeLeft = Math.max(0, WHACK_SECONDS - elapsed / 1000);

  return (
    <div className="max-w-xl mx-auto select-none">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={combo >= 2 ? "text-orange-500 scale-110" : "text-slate-300"}>🔥 x{combo}</span>
        <span className={timeLeft < 8 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>
      <div className="mb-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${(timeLeft / WHACK_SECONDS) * 100}%` }}
        />
      </div>

      {stage === "play" ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {holes.map((h, slot) => (
            <button
              key={slot}
              type="button"
              onPointerDown={() => h && h.hit === undefined && whack(h.i)}
              className="relative h-24 sm:h-28 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 shadow-inner overflow-hidden active:scale-95 transition-transform"
            >
              {h && h.hit !== undefined ? (
                <span
                  className={`absolute inset-0 flex items-center justify-center text-3xl font-black animate-lb-pop ${
                    h.hit < 0 ? "text-red-400" : "text-emerald-300"
                  }`}
                >
                  {h.hit < 0 ? `💥 ${h.hit}` : `+${h.hit}`}
                </span>
              ) : h ? (
                <span
                  className={`absolute inset-1.5 rounded-xl p-1.5 flex flex-col items-center justify-center text-center animate-lb-pop ${
                    h.s.kind === "bomb"
                      ? "bg-gradient-to-br from-red-500 to-orange-500 text-white"
                      : h.s.kind === "gold"
                        ? "bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950"
                        : "bg-white text-slate-800"
                  }`}
                >
                  {h.s.kind === "bomb" ? (
                    <>
                      <span className="text-2xl">💣</span>
                      <span className="text-[10px] font-black leading-tight">Deploy Jumat Sore</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-mono font-bold text-indigo-500">
                        {h.s.kind === "gold" ? "✨ TIKET EMAS" : `${PRIORITY_DOT[h.s.priority]} ${h.s.ticket_id}`}
                      </span>
                      <span className="text-[11px] font-semibold leading-tight line-clamp-2">{h.s.subject}</span>
                    </>
                  )}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">⏱ Waktu habis! Menunggu pemain lain selesai…</p>
      )}

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">🔴 +5 · 🟠 +3 · 🔵 +2 · ⚪ +1 · ✨ +10 · 💣 -5 · kombo x5 = poin berlipat</p>
    </div>
  );
}
