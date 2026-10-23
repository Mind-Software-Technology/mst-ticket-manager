"use client";

// =====================================================
// MazeRace — Labirin Kilat (multiplayer)
//
// Labirin 15x15 dibuat host (sama untuk semua). Ada kabut: hanya area
// sekitar kamu dan yang sudah dijelajahi yang terlihat. Posisi pemain
// lain disiarkan lewat `prog` (n = indeks sel) dan tampak kalau berada
// di dekatmu. Sampai finish = 400 + bonus waktu; belum = poin kedekatan.
// =====================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { avatarFor, MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  MAZE_E,
  MAZE_N,
  MAZE_S,
  MAZE_SECONDS,
  MAZE_SIZE,
  MAZE_W,
  mazeDistances,
  mazeStep,
} from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
type Dir = "U" | "D" | "L" | "R";

const COUNTDOWN = 3;
const SIGHT = 2;
const SEND_EVERY_MS = 150;
const GOAL = MAZE_SIZE * MAZE_SIZE - 1;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

/** Sel dalam jangkauan pandang (Chebyshev) dari `pos`. */
function nearby(pos: number): number[] {
  const r = Math.floor(pos / MAZE_SIZE);
  const c = pos % MAZE_SIZE;
  const out: number[] = [];
  for (let dr = -SIGHT; dr <= SIGHT; dr++) {
    for (let dc = -SIGHT; dc <= SIGHT; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < MAZE_SIZE && cc >= 0 && cc < MAZE_SIZE) out.push(rr * MAZE_SIZE + cc);
    }
  }
  return out;
}

export function MazeRace({
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
  const maze = useMemo(() => config.maze ?? [], [config.maze]);
  const dist = useMemo(() => mazeDistances(maze), [maze]);
  const joined = config.players;
  const startDist = dist[0] > 0 ? dist[0] : 1;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [pos, setPos] = useState(0);
  const [seen, setSeen] = useState<boolean[]>(() => {
    const s = Array<boolean>(MAZE_SIZE * MAZE_SIZE).fill(false);
    nearby(0).forEach((i) => (s[i] = true));
    return s;
  });
  const [others, setOthers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAZE_SECONDS);
  const [bump, setBump] = useState(false);

  const startRef = useRef(0);
  const posRef = useRef(0);
  const bestDist = useRef(startDist);
  const scoreRef = useRef(0);
  const dirty = useRef(false);
  const doneSent = useRef(false);
  const moveRef = useRef<(d: Dir) => void>(() => {});

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  // Posisi pemain lain.
  useEffect(
    () =>
      room.subscribe((m) => {
        if (m.t === "prog" && m.id !== me.id) setOthers((prev) => ({ ...prev, [m.id]: m.n }));
      }),
    [room, me.id],
  );

  const finish = (final: number) => {
    if (doneSent.current) return;
    doneSent.current = true;
    scoreRef.current = final;
    setScore(final);
    setStage("done");
    room.send({ t: "prog", id: me.id, score: final, n: posRef.current, done: true });
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
      const left = MAZE_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish(scoreRef.current);
        return;
      }
      setTimeLeft(left);
      if (dirty.current) {
        dirty.current = false;
        room.send({ t: "prog", id: me.id, score: scoreRef.current, n: posRef.current });
      }
    },
    stage === "play" ? SEND_EVERY_MS : null,
  );

  useEffect(() => {
    moveRef.current = (dir) => {
      if (stage !== "play") return;
      const next = mazeStep(maze, posRef.current, dir);
      if (next === posRef.current) {
        setBump(true);
        setTimeout(() => setBump(false), 120);
        return;
      }
      posRef.current = next;
      setPos(next);
      dirty.current = true;
      setSeen((prev) => {
        const s = [...prev];
        nearby(next).forEach((i) => (s[i] = true));
        return s;
      });
      if (next === GOAL) {
        const remaining = Math.max(0, MAZE_SECONDS - (nowMs() - startRef.current) / 1000);
        finish(400 + Math.round(remaining * 5));
        return;
      }
      if (dist[next] >= 0 && dist[next] < bestDist.current) {
        bestDist.current = dist[next];
        scoreRef.current = Math.round((1 - bestDist.current / startDist) * 300);
        setScore(scoreRef.current);
      }
    };
  });

  useEffect(() => {
    if (stage !== "play") return;
    const keys: Record<string, Dir> = {
      arrowup: "U",
      w: "U",
      arrowdown: "D",
      s: "D",
      arrowleft: "L",
      a: "L",
      arrowright: "R",
      d: "R",
    };
    const onKey = (e: KeyboardEvent) => {
      const d = keys[e.key.toLowerCase()];
      if (!d) return;
      e.preventDefault();
      moveRef.current(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="400+ = sampai finish (makin besar makin cepat). Di bawah 400 = kedekatan dengan finish."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.labirin.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Labirin Kilat</h3>
        <p className="mt-1 text-sm text-slate-500">Mulai dari pojok kiri atas, finish di pojok kanan bawah 🏁. Awas kabut!</p>
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
          {pos === GOAL ? "🏁 Kamu sampai finish!" : "⏱ Waktu habis!"} Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const lit = new Set(nearby(pos));
  const rivals = joined.filter((p) => p.id !== me.id && others[p.id] !== undefined);
  const pad =
    "flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:scale-90 transition";

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 15 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <div
        className={`grid gap-0 overflow-hidden rounded-2xl border-2 bg-slate-900 transition-colors ${bump ? "border-red-400" : "border-slate-700"}`}
        style={{ gridTemplateColumns: `repeat(${MAZE_SIZE}, minmax(0, 1fr))` }}
      >
        {maze.map((walls, i) => {
          const isSeen = seen[i];
          const isLit = lit.has(i);
          const rival = isLit ? rivals.find((p) => others[p.id] === i) : undefined;
          const wall = "#0f172a";
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center text-[9px] leading-none sm:text-sm ${
                !isSeen ? "bg-slate-900" : isLit ? "bg-white" : "bg-slate-300"
              }`}
              style={
                isSeen
                  ? {
                      borderTop: `2px solid ${walls & MAZE_N ? "transparent" : wall}`,
                      borderRight: `2px solid ${walls & MAZE_E ? "transparent" : wall}`,
                      borderBottom: `2px solid ${walls & MAZE_S ? "transparent" : wall}`,
                      borderLeft: `2px solid ${walls & MAZE_W ? "transparent" : wall}`,
                    }
                  : undefined
              }
            >
              {i === pos ? avatarFor(me.id) : rival ? avatarFor(rival.id) : isSeen && i === GOAL ? "🏁" : ""}
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 justify-items-center gap-1.5">
        <span />
        <button type="button" className={pad} onPointerDown={() => moveRef.current("U")} aria-label="Atas">
          <ArrowUp className="h-5 w-5" />
        </button>
        <span />
        <button type="button" className={pad} onPointerDown={() => moveRef.current("L")} aria-label="Kiri">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onPointerDown={() => moveRef.current("D")} aria-label="Bawah">
          <ArrowDown className="h-5 w-5" />
        </button>
        <button type="button" className={pad} onPointerDown={() => moveRef.current("R")} aria-label="Kanan">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-slate-400">Panah / WASD · lawan hanya terlihat kalau dekat denganmu</p>

      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
