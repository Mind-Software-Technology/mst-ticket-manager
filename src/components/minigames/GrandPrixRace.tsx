"use client";

// =====================================================
// GrandPrixRace — Grand Prix Ketik (multiplayer)
//
// Semua pemain mengetik kalimat yang sama (dibuat host). Mobil tiap
// pemain maju sesuai jumlah huruf yang benar; salah ketik menahan mobil
// sampai diperbaiki. Posisi disiarkan lewat `prog` (n = huruf benar),
// jadi lintasan semua pemain bergerak langsung tanpa host mengatur ronde.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { avatarFor, MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { GP_SECONDS, gpCorrectPrefix, gpScore } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const SYNC_MS = 120;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function GrandPrixRace({
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
  const text = config.gp ?? "";
  const joined = config.players;
  const { subscribe } = room;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [typed, setTyped] = useState("");
  const [timeLeft, setTimeLeft] = useState(GP_SECONDS);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  /** Huruf benar pemain lain (dari siaran prog). */
  const [others, setOthers] = useState<Record<string, number>>({});

  const startRef = useRef(0);
  const sentRef = useRef(-1);
  const doneSent = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const correct = gpCorrectPrefix(typed, text);
  const myScore = finalScore ?? gpScore(correct, false, 0);

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, myScore, stage === "done");

  useEffect(
    () =>
      subscribe((m) => {
        if (m.t === "prog") setOthers((prev) => ({ ...prev, [m.id]: m.n }));
      }),
    [subscribe],
  );

  useEffect(() => {
    if (stage === "play") inputRef.current?.focus();
  }, [stage]);

  const finish = (didFinish: boolean, chars: number, secsLeft: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    const final = gpScore(chars, didFinish, secsLeft);
    setFinalScore(final);
    setFinished(didFinish);
    setStage("done");
    room.send({ t: "prog", id: me.id, score: final, n: chars, done: true });
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
      if (ms >= GP_SECONDS * 1000) {
        setTimeLeft(0);
        finish(false, correct, 0);
      } else setTimeLeft(GP_SECONDS - ms / 1000);
    },
    stage === "play" ? 100 : null,
  );

  // Siarkan posisi berkala, hanya kalau berubah.
  useInterval(
    () => {
      if (correct === sentRef.current) return;
      sentRef.current = correct;
      room.send({ t: "prog", id: me.id, score: gpScore(correct, false, 0), n: correct });
    },
    stage === "play" ? SYNC_MS : null,
  );

  const onChange = (value: string) => {
    if (stage !== "play") return;
    const next = value.slice(0, text.length);
    setTyped(next);
    if (next === text) {
      const secsLeft = GP_SECONDS - (nowMs() - startRef.current) / 1000;
      finish(true, text.length, secsLeft);
    }
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={finished ? "Sampai finish lebih cepat = bonus waktu lebih besar." : undefined}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.gp.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Grand Prix Ketik</h3>
        <p className="mt-1 text-sm text-slate-500">Ketik kalimatnya, majukan mobilmu, dan jadilah yang pertama finish!</p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  const elapsedMin = Math.max(0.05, (GP_SECONDS - timeLeft) / 60);
  const wpm = stage === "play" && GP_SECONDS - timeLeft > 2 ? Math.round(correct / 5 / elapsedMin) : 0;

  const lanes = joined.map((p) => {
    const chars = p.id === me.id ? correct : (others[p.id] ?? 0);
    const finishedLane = p.id === me.id ? finalScore !== null && finished : chars >= text.length;
    return { p, frac: finishedLane ? 1 : Math.min(1, chars / Math.max(1, text.length)), finishedLane };
  });

  return (
    <div className="max-w-2xl mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          {wpm > 0 ? (
            <>
              <span className="text-xl font-black text-indigo-600">{wpm}</span> WPM
            </>
          ) : (
            "Siap…"
          )}
        </span>
        {stage === "done" ? (
          <span className="text-emerald-600">{finished ? "🏁 Finish!" : "⏱ Waktu habis"}</span>
        ) : (
          <span className={timeLeft < 15 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
        )}
      </div>

      <div className="space-y-1.5 rounded-2xl bg-slate-800 p-3 shadow-inner">
        {lanes.map(({ p, frac, finishedLane }) => {
          const mine = p.id === me.id;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className={`w-20 shrink-0 truncate text-[11px] font-bold ${mine ? "text-yellow-300" : "text-slate-300"}`}>
                {avatarFor(p.id)} {mine ? "Kamu" : p.name}
              </span>
              <div className="relative h-8 flex-1 rounded-lg bg-slate-700">
                <div className="absolute inset-y-0 right-0 flex w-6 items-center justify-center rounded-r-lg bg-white/10 text-sm">
                  🏁
                </div>
                <div
                  className="absolute inset-y-0 left-0 w-full transition-[padding] duration-150 ease-out"
                  style={{ paddingLeft: `calc((100% - 2rem) * ${frac})` }}
                >
                  <span
                    className={`inline-block text-2xl leading-8 [transform:scaleX(-1)] ${
                      finishedLane ? "animate-lb-pop" : ""
                    }`}
                  >
                    🏎️
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="mt-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-lg leading-relaxed"
        onClick={() => inputRef.current?.focus()}
      >
        {text.split("").map((ch, i) => {
          let cls = "text-slate-400";
          if (i < correct) cls = "text-emerald-600";
          else if (i < typed.length) cls = "bg-red-200 text-red-700";
          else if (i === typed.length && stage === "play") cls = "bg-indigo-200 text-slate-900";
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </p>

      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        disabled={stage !== "play"}
        placeholder={stage === "play" ? "Mulai mengetik di sini…" : "Menunggu pemain lain…"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none ${
          typed.length > correct ? "border-red-400" : "border-slate-200 focus:border-indigo-500"
        } disabled:bg-slate-50`}
      />
      {typed.length > correct && stage === "play" && (
        <p className="mt-1 text-xs font-semibold text-red-500">Ada huruf yang salah. Hapus lalu ketik ulang supaya mobil jalan lagi.</p>
      )}

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
