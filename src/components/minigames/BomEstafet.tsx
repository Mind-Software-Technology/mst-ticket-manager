"use client";

// =====================================================
// BomEstafet — Bom Estafet (multiplayer)
//
// Satu bom beredar. Pemegang bom melempar ke pemain lain yang masih hidup
// (`pass`). Host menentukan waktu ledakan acak dan menyiarkan `boom`; yang
// memegang bom saat itu gugur. Ronde berlanjut sampai tersisa satu penyintas.
// Semua klien menghitung pemegang bom, daftar hidup, dan skor dari pesan
// yang sama.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { BOM_MAX_MS, BOM_MIN_MS, BOM_SURVIVE_POINTS, BOM_WINNER_BONUS } from "@/lib/mp-content";
import { MP_MODES, avatarFor, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "intro" | "play" | "boom" | "done";

const INTRO_MS = 3000;
const BOOM_SHOW_MS = 3500;
const HOST_GONE_MS = 6000;

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

const randomBetween = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export function BomEstafet({
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
  const isHost = config.hostId === me.id;
  const nameOf = (id: string) => (id === me.id ? "Kamu" : (joined.find((p) => p.id === id)?.name ?? "Pemain"));

  const [stage, setStage] = useState<Stage>("intro");
  const [idx, setIdx] = useState(0);
  const [alive, setAlive] = useState<string[]>(() => joined.map((p) => p.id));
  const [holder, setHolder] = useState("");
  const [boomed, setBoomed] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [gain, setGain] = useState<Record<string, number>>({});
  const [feed, setFeed] = useState<string[]>([]);
  const [aborted, setAborted] = useState(false);

  const aliveRef = useRef<string[]>(joined.map((p) => p.id));
  const holderRef = useRef("");
  const idxRef = useRef(0);
  const presentRef = useRef<string[]>([]);
  const hostBoomed = useRef<Set<number>>(new Set());
  const seenBooms = useRef<Set<number>>(new Set());
  const bonusGiven = useRef(false);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
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

  const hostBoom = (i: number) => {
    if (hostBoomed.current.has(i) || !holderRef.current) return;
    hostBoomed.current.add(i);
    room.send({ t: "boom", i, id: holderRef.current });
  };

  useEffect(() => {
    handler.current = (m) => {
      switch (m.t) {
        case "round": {
          idxRef.current = m.i;
          setIdx(m.i);
          setStage("play");
          setBoomed(null);
          setFeed([]);
          setGain({});
          if (isHost) {
            // Bom dibagikan ke penyintas yang masih ada di ruangan, lalu dijadwalkan meledak.
            const here = aliveRef.current.filter((id) => presentRef.current.includes(id));
            const pool = here.length > 0 ? here : aliveRef.current;
            room.send({ t: "pass", from: "", to: pool[Math.floor(Math.random() * pool.length)] });
            later(() => hostBoom(m.i), randomBetween(BOM_MIN_MS, BOM_MAX_MS));
          }
          break;
        }
        case "pass":
          holderRef.current = m.to;
          setHolder(m.to);
          if (m.from) setFeed((f) => [...f.slice(-4), `${nameOf(m.from)} → ${nameOf(m.to)}`]);
          break;
        case "boom": {
          if (seenBooms.current.has(m.i)) break;
          seenBooms.current.add(m.i);
          const survivors = aliveRef.current.filter((id) => id !== m.id);
          aliveRef.current = survivors;
          setAlive(survivors);
          const pts = Object.fromEntries(survivors.map((id) => [id, BOM_SURVIVE_POINTS]));
          setGain(pts);
          setScores((prev) => {
            const next = { ...prev };
            for (const id of survivors) next[id] = (next[id] ?? 0) + BOM_SURVIVE_POINTS;
            return next;
          });
          setBoomed(m.id);
          setStage("boom");
          if (isHost) {
            later(() => {
              if (survivors.length > 1) room.send({ t: "round", i: m.i + 1 });
              else room.send({ t: "end" });
            }, BOOM_SHOW_MS);
          }
          break;
        }
        case "end":
          if (!bonusGiven.current) {
            bonusGiven.current = true;
            const last = aliveRef.current;
            if (last.length === 1) setScores((prev) => ({ ...prev, [last[0]]: (prev[last[0]] ?? 0) + BOM_WINNER_BONUS }));
          }
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

  // Host: kalau pemegang bom keluar dari ruangan, bom langsung meledak supaya permainan tidak macet.
  useInterval(
    () => {
      if (holderRef.current && !presentRef.current.includes(holderRef.current)) hostBoom(idxRef.current);
    },
    isHost && stage === "play" ? 1000 : null,
  );

  // Host menghilang di tengah permainan → selesai dengan skor saat ini.
  const hostGone = !room.players.some((p) => p.id === config.hostId);
  useEffect(() => {
    if (!hostGone) return;
    const id = setTimeout(() => setAborted(true), HOST_GONE_MS);
    return () => clearTimeout(id);
  }, [hostGone]);

  const passTo = (to: string) => {
    if (stage !== "play" || holderRef.current !== me.id) return;
    room.send({ t: "pass", from: me.id, to });
  };

  if (stage === "done" || aborted) {
    const winner = alive.length === 1 ? joined.find((p) => p.id === alive[0]) : undefined;
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={
          aborted && stage !== "done"
            ? "Host keluar, permainan dihentikan."
            : winner
              ? `${winner.id === me.id ? "Kamu" : winner.name} jadi penyintas terakhir! (+${BOM_WINNER_BONUS})`
              : undefined
        }
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl animate-lb-float inline-block">{MP_MODES.bom.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Bom Estafet</h3>
        <p className="mt-2 text-sm text-slate-500">Lempar bom secepatnya. Jangan sampai meledak di tanganmu!</p>
        <p className="mt-4 text-xs text-slate-400">{joined.map((p) => p.name).join(" · ")}</p>
      </div>
    );
  }

  const iAmAlive = alive.includes(me.id);
  const iHold = holder === me.id;
  const targets = joined.filter((p) => p.id !== me.id && alive.includes(p.id) && room.players.some((r) => r.id === p.id));

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>Ronde {idx + 1}</span>
        <span>
          {MP_MODES.bom.emoji} {alive.length} penyintas
        </span>
      </div>

      {stage === "boom" ? (
        <div className="mt-3 rounded-2xl bg-slate-900 px-4 py-8 text-center text-white">
          <div className="text-7xl animate-lb-pop">💥</div>
          <p className="mt-2 text-xl font-black">{boomed === me.id ? "Bom meledak di tanganmu!" : `Bom meledak di ${nameOf(boomed ?? "")}!`}</p>
          <p className="mt-1 text-sm text-slate-300">
            {boomed === me.id ? "Kamu gugur. 💀" : iAmAlive ? `Kamu selamat! +${BOM_SURVIVE_POINTS}` : "Kamu masih menonton dari pinggir."}
          </p>
        </div>
      ) : (
        <div
          className={`mt-3 rounded-2xl px-4 py-6 text-center ${
            iHold ? "bg-red-600 text-white shadow-xl" : "bg-slate-800 text-white"
          }`}
        >
          <div className={`text-7xl inline-block ${iHold ? "animate-pulse" : ""}`}>💣</div>
          <p className="mt-2 text-lg font-black">
            {iHold ? "BOM ADA DI TANGANMU! LEMPAR!" : holder ? `Bom ada di ${avatarFor(holder)} ${nameOf(holder)}` : "Bom dibagikan…"}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {!iAmAlive ? "💀 Kamu sudah gugur. Nonton dulu sampai ada pemenangnya." : iHold ? "Pilih siapa yang kamu lempari bom ini." : "Berdoa semoga tidak dilempar ke kamu…"}
          </p>
        </div>
      )}

      {stage === "play" && iHold && iAmAlive && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {targets.map((p) => (
            <button
              key={p.id}
              type="button"
              onPointerDown={() => passTo(p.id)}
              className="rounded-xl border-2 border-red-300 bg-white px-3 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 active:scale-95"
            >
              {avatarFor(p.id)} {p.name}
            </button>
          ))}
        </div>
      )}

      {feed.length > 0 && stage === "play" && (
        <ul className="mt-2 space-y-0.5 text-center text-xs text-slate-400">
          {feed.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <Scoreboard
          players={joined}
          scores={scores}
          meId={me.id}
          gain={stage === "boom" ? gain : undefined}
          suffix={(id) => (alive.includes(id) ? (stage === "play" && holder === id ? "💣" : "❤️") : "💀")}
        />
      </div>
    </div>
  );
}
