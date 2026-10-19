"use client";

// =====================================================
// WhackGame — Gebuk Tiket
//
// Grid 3x3, 30 detik. Tiket asli muncul dari lubang lalu kabur; tap
// untuk menggebuk. Poin sesuai prioritas x pengali kombo. Awas 💣
// "Deploy Jumat Sore": -5 poin dan kombo hangus. Makin lama makin cepat.
// =====================================================

import { useRef, useState } from "react";
import { PRIORITY_DOT, WHACK_POINTS, type GameTicket } from "@/lib/minigame";
import { Hud, ResultCard, StartCard, useBest, useInterval } from "./GameParts";

const DURATION = 30;
const HOLES = 9;
const MIN_TICKETS = 3;
const HIT_SHOW_MS = 450;
const BOMB_CHANCE = 0.12;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

type Phase = "start" | "play" | "result";

interface Hole {
  kind: "ticket" | "bomb";
  ticket?: GameTicket;
  expires: number;
  /** Terisi setelah di-tap: poin yang didapat (negatif = kena bom). */
  hit?: number;
}

export function WhackGame({ tickets, userId }: { tickets: GameTicket[]; userId?: string }) {
  const { best, submit } = useBest(userId, "whack");

  const [phase, setPhase] = useState<Phase>("start");
  const [holes, setHoles] = useState<Array<Hole | null>>(() => Array(HOLES).fill(null));
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [isRecord, setIsRecord] = useState(false);
  const endRef = useRef(0);

  const start = () => {
    setHoles(Array(HOLES).fill(null));
    setScore(0);
    setCombo(0);
    setHits(0);
    setBombs(0);
    setIsRecord(false);
    setTimeLeft(DURATION);
    endRef.current = Date.now() + DURATION * 1000;
    setPhase("play");
  };

  const tick = () => {
    const now = Date.now();
    const left = (endRef.current - now) / 1000;
    if (left <= 0) {
      setTimeLeft(0);
      setIsRecord(submit(score));
      setPhase("result");
      return;
    }
    setTimeLeft(left);

    // Tiket yang kabur sebelum digebuk memutus kombo.
    if (holes.some((h) => h && h.hit === undefined && h.kind === "ticket" && now >= h.expires)) setCombo(0);
    const next = holes.map((h) => (h && now >= h.expires ? null : h));

    // Makin lama: muncul makin sering dan hidup makin singkat.
    const elapsed = DURATION - left;
    const spawnChance = 0.2 + elapsed * 0.006;
    const life = Math.max(850, 1700 - elapsed * 25);
    const empty = next.flatMap((h, i) => (h ? [] : [i]));
    if (empty.length > 0 && Math.random() < spawnChance) {
      const slot = empty[Math.floor(Math.random() * empty.length)];
      next[slot] =
        Math.random() < BOMB_CHANCE
          ? { kind: "bomb", expires: now + life }
          : { kind: "ticket", ticket: tickets[Math.floor(Math.random() * tickets.length)], expires: now + life };
    }
    setHoles(next);
  };

  useInterval(tick, phase === "play" ? 100 : null);

  const whack = (i: number) => {
    const h = holes[i];
    if (!h || h.hit !== undefined || phase !== "play") return;
    const expires = nowMs() + HIT_SHOW_MS;
    let points: number;
    if (h.kind === "bomb") {
      points = -5;
      setScore((s) => Math.max(0, s - 5));
      setCombo(0);
      setBombs((b) => b + 1);
    } else {
      points = WHACK_POINTS[h.ticket?.priority ?? "normal"] * (1 + Math.floor(combo / 5));
      setScore((s) => s + points);
      setCombo((c) => c + 1);
      setHits((n) => n + 1);
    }
    setHoles((prev) => prev.map((x, idx) => (idx === i ? { ...h, hit: points, expires } : x)));
  };

  if (phase === "start") {
    return <StartCard game="whack" best={best} onStart={start} blocked={tickets.length < MIN_TICKETS} />;
  }

  if (phase === "result") {
    return (
      <ResultCard
        game="whack"
        score={score}
        best={best}
        isRecord={isRecord}
        stats={`${hits} tiket tergebuk · ${bombs} kena bom`}
        onAgain={start}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto select-none">
      <Hud score={score} combo={combo} fraction={timeLeft / DURATION} label={`${Math.ceil(timeLeft)}s`} />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {holes.map((h, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => whack(i)}
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
                  h.kind === "bomb" ? "bg-gradient-to-br from-red-500 to-orange-500 text-white" : "bg-white text-slate-800"
                }`}
              >
                {h.kind === "bomb" ? (
                  <>
                    <span className="text-2xl">💣</span>
                    <span className="text-[10px] font-black leading-tight">Deploy Jumat Sore</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-mono font-bold text-indigo-500">
                      {PRIORITY_DOT[h.ticket?.priority ?? "normal"]} {h.ticket?.ticket_id}
                    </span>
                    <span className="text-[11px] font-semibold leading-tight line-clamp-2">{h.ticket?.subject}</span>
                  </>
                )}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">🔴 +5 · 🟠 +3 · 🔵 +2 · ⚪ +1 · 💣 -5</p>
    </div>
  );
}
