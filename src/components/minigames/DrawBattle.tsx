"use client";

// =====================================================
// DrawBattle — Tebak Gambar (multiplayer)
//
// Ronde = jumlah pemain x 2; tukang gambar bergiliran (pemain ke-(ronde mod N)).
// Host mengatur giliran seperti QuizBattle: kirim `round`, kumpulkan `hit`
// (tebakan benar), lalu kirim `reveal` berisi semua tebakan benar. Goresan
// disiarkan dalam potongan kecil dan digambar ulang di semua klien.
// =====================================================

import { useEffect, useRef, useState } from "react";
import {
  DRAW_SECONDS,
  MP_MODES,
  scoreDraw,
  type MpMessage,
  type MpPlayer,
  type RoundAnswers,
  type StartPayload,
} from "@/lib/multiplayer";
import { drawHint, normalizeGuess } from "@/lib/mp-content";
import { FinalPodium, Scoreboard } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "intro" | "draw" | "reveal" | "done";

const INTRO_MS = 3000;
const REVEAL_MS = 5000;
const GRACE_MS = 2000;
const FLUSH_MS = 130;
const DRAW_MS = DRAW_SECONDS * 1000;

const CANVAS_W = 600;
const CANVAS_H = 400;
const COLORS = ["#0f172a", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ffffff"];
const ERASER = COLORS.length - 1;
const WIDTHS = [4, 10];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

interface FeedItem {
  key: number;
  kind: "guess" | "hit";
  name: string;
  text: string;
}

type Pt = readonly [number, number];

function drawSegment(canvas: HTMLCanvasElement | null, from: Pt, to: Pt, color: number, width: number) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = COLORS[color] ?? COLORS[0];
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = color === ERASER ? width * 2.5 : width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const fx = (from[0] / 1000) * CANVAS_W;
  const fy = (from[1] / 1000) * CANVAS_H;
  const tx = (to[0] / 1000) * CANVAS_W;
  const ty = (to[1] / 1000) * CANVAS_H;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
}

function wipe(canvas: HTMLCanvasElement | null) {
  const ctx = canvas?.getContext("2d");
  if (!ctx || !canvas) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function DrawBattle({
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
  const words = config.words ?? [];
  const joined = config.players;
  const isHost = config.hostId === me.id;
  const total = words.length;

  const [stage, setStage] = useState<Stage>("intro");
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [gain, setGain] = useState<Record<string, number>>({});
  const [guessed, setGuessed] = useState<string[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [timeLeft, setTimeLeft] = useState(DRAW_MS);
  const [aborted, setAborted] = useState(false);
  const [text, setText] = useState("");
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roundStart = useRef(0);
  const hostHits = useRef<Record<number, RoundAnswers>>({});
  const hostRevealed = useRef<Set<number>>(new Set());
  const scored = useRef<Set<number>>(new Set());
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const presentRef = useRef<string[]>([]);
  const handler = useRef<(m: MpMessage) => void>(() => {});
  const feedKey = useRef(0);
  // Goresan tukang gambar
  const drawing = useRef(false);
  const last = useRef<Pt>([0, 0]);
  const buf = useRef<number[]>([]);
  const newStroke = useRef(true);
  const brush = useRef({ color: 0, width: 0 });
  // Goresan yang diterima
  const remoteLast = useRef<Pt | null>(null);
  const idxRef = useRef(0);
  const stageRef = useRef<Stage>("intro");

  useEffect(() => {
    presentRef.current = room.players.map((p) => p.id);
    brush.current = { color, width: WIDTHS[width] };
    idxRef.current = idx;
    stageRef.current = stage;
  });

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  const drawerOf = (i: number) => joined[i % joined.length];
  const guessersOf = (i: number) => joined.filter((p) => p.id !== drawerOf(i)?.id);
  const nameOf = (id: string) => joined.find((p) => p.id === id)?.name ?? "Pemain";

  const hostReveal = (i: number) => {
    if (hostRevealed.current.has(i)) return;
    hostRevealed.current.add(i);
    room.send({ t: "reveal", i, answers: hostHits.current[i] ?? {} });
    later(() => {
      if (i + 1 < total) room.send({ t: "round", i: i + 1 });
      else room.send({ t: "end" });
    }, REVEAL_MS);
  };

  useEffect(() => {
    handler.current = (m) => {
      switch (m.t) {
        case "round":
          setIdx(m.i);
          setStage("draw");
          setGuessed([]);
          setFeed([]);
          setText("");
          setTimeLeft(DRAW_MS);
          roundStart.current = nowMs();
          remoteLast.current = null;
          buf.current = [];
          drawing.current = false;
          newStroke.current = true;
          wipe(canvasRef.current);
          if (isHost) later(() => hostReveal(m.i), DRAW_MS + GRACE_MS);
          break;
        case "stroke": {
          if (m.i !== idxRef.current || stageRef.current !== "draw") break;
          if (drawerOf(m.i)?.id === me.id) break;
          if (m.s) remoteLast.current = null;
          for (let k = 0; k + 1 < m.p.length; k += 2) {
            const pt: Pt = [m.p[k], m.p[k + 1]];
            drawSegment(canvasRef.current, remoteLast.current ?? pt, pt, m.c, m.w);
            remoteLast.current = pt;
          }
          break;
        }
        case "clear":
          if (m.i === idxRef.current) {
            wipe(canvasRef.current);
            remoteLast.current = null;
          }
          break;
        case "guess":
          if (m.i !== idxRef.current) break;
          setFeed((f) => [...f.slice(-29), { key: feedKey.current++, kind: "guess", name: nameOf(m.id), text: m.text }]);
          break;
        case "hit": {
          if (m.i !== idxRef.current) break;
          setGuessed((g) => (g.includes(m.id) ? g : [...g, m.id]));
          setFeed((f) => [...f.slice(-29), { key: feedKey.current++, kind: "hit", name: nameOf(m.id), text: "" }]);
          if (!isHost) break;
          const bucket = (hostHits.current[m.i] ??= {});
          if (!bucket[m.id]) bucket[m.id] = { c: 1, ms: m.ms };
          const waiting = guessersOf(m.i).filter((p) => presentRef.current.includes(p.id));
          if (waiting.every((p) => bucket[p.id])) later(() => hostReveal(m.i), 1200);
          break;
        }
        case "reveal": {
          if (scored.current.has(m.i)) break;
          scored.current.add(m.i);
          const drawer = drawerOf(m.i);
          const pts = scoreDraw(
            drawer.id,
            m.answers,
            guessersOf(m.i).map((p) => p.id),
          );
          setGain(Object.fromEntries(joined.map((p) => [p.id, pts[p.id] ?? 0])));
          setGuessed(Object.keys(m.answers));
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
    () => setTimeLeft(Math.max(0, DRAW_MS - (nowMs() - roundStart.current))),
    stage === "draw" ? 200 : null,
  );

  const drawer = drawerOf(idx);
  const iAmDrawer = drawer?.id === me.id;
  const word = words[idx] ?? "";

  // Tukang gambar mengirim potongan goresan secara berkala.
  const flush = () => {
    if (buf.current.length === 0) return;
    room.send({
      t: "stroke",
      i: idxRef.current,
      c: brush.current.color,
      w: brush.current.width,
      s: newStroke.current,
      p: buf.current,
    });
    buf.current = [];
    newStroke.current = false;
  };
  useInterval(flush, stage === "draw" && iAmDrawer ? FLUSH_MS : null);

  const toPt = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));
    return [clamp(((e.clientX - rect.left) / rect.width) * 1000), clamp(((e.clientY - rect.top) / rect.height) * 1000)];
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage !== "draw" || !iAmDrawer) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toPt(e);
    drawing.current = true;
    newStroke.current = true;
    last.current = pt;
    buf.current = [pt[0], pt[1]];
    drawSegment(canvasRef.current, pt, pt, brush.current.color, brush.current.width);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const pt = toPt(e);
    drawSegment(canvasRef.current, last.current, pt, brush.current.color, brush.current.width);
    last.current = pt;
    buf.current.push(pt[0], pt[1]);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    flush();
    newStroke.current = true;
  };

  const clearCanvas = () => {
    if (stage !== "draw" || !iAmDrawer) return;
    wipe(canvasRef.current);
    buf.current = [];
    newStroke.current = true;
    room.send({ t: "clear", i: idx });
  };

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    setText("");
    if (!t || stage !== "draw" || iAmDrawer || timeLeft <= 0 || guessed.includes(me.id)) return;
    if (normalizeGuess(t) === normalizeGuess(word)) {
      room.send({ t: "hit", i: idx, id: me.id, ms: nowMs() - roundStart.current });
    } else {
      room.send({ t: "guess", i: idx, id: me.id, text: t.slice(0, 40) });
    }
  };

  if (stage === "done" || aborted) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice={aborted && stage !== "done" ? "Host keluar, permainan dihentikan." : undefined}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "intro") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl animate-lb-float inline-block">{MP_MODES.gambar.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Tebak Gambar</h3>
        <p className="mt-2 text-sm text-slate-500">
          {total} ronde — tiap pemain jadi tukang gambar 2 kali. Siapkan jarimu!
        </p>
        <p className="mt-4 text-xs text-slate-400">{joined.map((p) => p.name).join(" · ")}</p>
      </div>
    );
  }

  const reveal = stage === "reveal";
  const iGuessed = guessed.includes(me.id);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>
          Ronde {idx + 1}/{total}
        </span>
        <span>
          🎨 {iAmDrawer ? "Kamu" : drawer?.name} menggambar
        </span>
        <span className={timeLeft < 10000 && !reveal ? "text-red-500 animate-pulse" : ""}>
          {reveal ? "Selesai" : `⏱ ${Math.ceil(timeLeft / 1000)}s`}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            timeLeft < 10000 ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-indigo-500"
          }`}
          style={{ width: `${reveal ? 0 : (timeLeft / DRAW_MS) * 100}%` }}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
        {reveal ? (
          <>
            <p className="text-xs font-bold text-slate-400">Kata rahasianya</p>
            <p className="text-3xl font-black text-indigo-600">{word}</p>
          </>
        ) : iAmDrawer ? (
          <>
            <p className="text-xs font-bold text-slate-400">Gambarkan ini (jangan menulis huruf!)</p>
            <p className="text-3xl font-black text-indigo-600">{word}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-slate-400">Tebak gambarnya ({word.length} huruf)</p>
            <p className="font-mono text-2xl font-black tracking-widest text-slate-800">
              {drawHint(word, timeLeft < DRAW_MS / 2)}
            </p>
          </>
        )}
      </div>

      <canvas
        ref={(el) => {
          if (el && canvasRef.current !== el) {
            canvasRef.current = el;
            wipe(el);
          }
        }}
        width={CANVAS_W}
        height={CANVAS_H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className={`mt-3 w-full aspect-[3/2] rounded-2xl border-2 border-slate-200 bg-white touch-none ${
          iAmDrawer && !reveal ? "cursor-crosshair" : ""
        }`}
      />

      {iAmDrawer && !reveal && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(i)}
              title={i === ERASER ? "Penghapus" : "Warna"}
              className={`h-8 w-8 rounded-full border-2 text-xs transition ${
                color === i ? "border-indigo-600 scale-110" : "border-slate-300"
              }`}
              style={{ backgroundColor: c }}
            >
              {i === ERASER ? "🧽" : ""}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setWidth((w) => 1 - w)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600"
          >
            {width === 0 ? "✏️ Tipis" : "🖌️ Tebal"}
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            🗑️ Hapus semua
          </button>
        </div>
      )}

      {!iAmDrawer && !reveal && (
        <form onSubmit={submitGuess} className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={iGuessed}
            maxLength={40}
            placeholder={iGuessed ? "Benar! Tunggu yang lain…" : "Ketik tebakanmu lalu Enter"}
            className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none disabled:bg-emerald-50"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={iGuessed || !text.trim()}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40"
          >
            Tebak
          </button>
        </form>
      )}

      <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-xs">
        {feed.map((f) => (
          <li key={f.key} className={f.kind === "hit" ? "font-bold text-emerald-600" : "text-slate-500"}>
            {f.kind === "hit" ? `✅ ${f.name} menebak dengan benar!` : `${f.name}: ${f.text}`}
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <Scoreboard
          players={joined}
          scores={scores}
          meId={me.id}
          gain={reveal ? gain : undefined}
          suffix={(id) => (id === drawer?.id ? "🎨 tukang gambar" : guessed.includes(id) ? "✅" : null)}
        />
      </div>
    </div>
  );
}
