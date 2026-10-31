"use client";

// =====================================================
// KetukRace — Adu Ketuk (multiplayer)
//
// 10 detik, ketuk tombol sebanyak mungkin. Tidak butuh konten dari host.
// Skor disiarkan paling cepat tiap 150 ms supaya channel tidak kebanjiran.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { KETUK_SECONDS } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
const COUNTDOWN = 3;
const SYNC_MS = 150;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function KetukRace({
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
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(KETUK_SECONDS);
  const [pulse, setPulse] = useState(false);

  const startRef = useRef(0);
  const tapsRef = useRef(0);
  const sentRef = useRef(-1);
  const doneSent = useRef(false);
  const stageRef = useRef<Stage>("countdown");

  useEffect(() => {
    stageRef.current = stage;
  });

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, taps, stage === "done");

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: tapsRef.current, n: tapsRef.current, done: true });
  };

  const tap = () => {
    if (stageRef.current !== "play") return;
    tapsRef.current += 1;
    setTaps(tapsRef.current);
    setPulse((p) => !p);
  };

  // Spasi / Enter juga mengetuk (tahan tombol tidak dihitung berulang).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      if (ms >= KETUK_SECONDS * 1000) {
        setTimeLeft(0);
        finish();
      } else setTimeLeft(KETUK_SECONDS - ms / 1000);
    },
    stage === "play" ? 50 : null,
  );

  // Siarkan skor berkala, hanya kalau berubah.
  useInterval(
    () => {
      if (tapsRef.current === sentRef.current) return;
      sentRef.current = tapsRef.current;
      room.send({ t: "prog", id: me.id, score: tapsRef.current, n: tapsRef.current });
    },
    stage === "play" ? SYNC_MS : null,
  );

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={`Rata-rata kamu ${(taps / KETUK_SECONDS).toFixed(1)} ketukan per detik.`}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.ketuk.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Adu Ketuk</h3>
        <p className="mt-1 text-sm text-slate-500">Ketuk tombol sebanyak mungkin selama {KETUK_SECONDS} detik!</p>
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
          Selesai! {taps} ketukan. Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Ketukan <span className="text-xl font-black text-indigo-600">{taps}</span>
        </span>
        <span className={timeLeft < 4 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {timeLeft.toFixed(1)}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${(timeLeft / KETUK_SECONDS) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onPointerDown={tap}
        className={`mt-4 flex h-56 w-full touch-none items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-7xl text-white shadow-xl transition-transform duration-75 active:scale-95 ${
          pulse ? "brightness-110" : ""
        }`}
        aria-label="Ketuk"
      >
        👆
      </button>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
