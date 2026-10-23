"use client";

// =====================================================
// SlitherRace — Slither Arena (multiplayer, gaya slither.io)
//
// Arena 1800x1800 berisi pelet makanan. Gerakkan ular dengan mouse/jari,
// makan pelet supaya memanjang, tabrakkan kepalamu ke badan lawan = lawan
// mati dan menjatuhkan pelet (+100 poin untukmu). Menabrak badan lawan =
// kamu mati, tapi bisa respawn. 120 detik, skor tertinggi menang.
//
// Tanpa server game: tiap klien mensimulasikan ularnya sendiri dan
// menyiarkan posisinya lewat pesan `snk` (lihat lib/slither.ts).
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  BASE_SPEED,
  BOOST_SPEED,
  FOOD_TARGET,
  KILL_POINTS,
  MAX_LEN,
  MIN_BOOST_LEN,
  PELLET_POINTS,
  SEND_MS,
  SLITHER_SECONDS,
  SPACING,
  START_LEN,
  TURN_RATE,
  VIEW_H,
  VIEW_W,
  WORLD,
  angleDiff,
  followBody,
  hueOf,
  packBody,
  pointSegDist,
  seedPellets,
  snakeRadius,
  type Pellet,
} from "@/lib/slither";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";

interface Rival {
  a: number;
  b: boolean;
  len: number;
  seg: number[];
  /** Kapan pesan terakhir diterima (ms). */
  rx: number;
}

interface Sim {
  segs: number[];
  angle: number;
  target: number;
  boost: boolean;
  grow: number;
  boostAcc: number;
  alive: boolean;
  respawnAt: number;
  spawnedAt: number;
}

interface Hud {
  score: number;
  len: number;
  alive: boolean;
  left: number;
}

const COUNTDOWN = 3;
const RESPAWN_MS = 2500;
const SPAWN_SHIELD_MS = 1500;
const STALE_MS = 3000;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const newFoodId = () => 1_000_000 + Math.floor(Math.random() * 1_000_000_000);

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function SlitherRace({
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

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [hud, setHud] = useState<Hud>({ score: 0, len: START_LEN, alive: true, left: SLITHER_SECONDS });
  const [feed, setFeed] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pellets = useRef<Map<number, Pellet>>(new Map());
  const rivals = useRef<Record<string, Rival>>({});
  const sim = useRef<Sim>({
    segs: [],
    angle: 0,
    target: 0,
    boost: false,
    grow: 0,
    boostAcc: 0,
    alive: false,
    respawnAt: 0,
    spawnedAt: 0,
  });
  const cam = useRef({ x: WORLD / 2, y: WORLD / 2 });
  const scoreRef = useRef(0);
  const startRef = useRef(0);
  const nextFoodId = useRef(100_000);
  const sendRef = useRef(room.send);
  const namesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    sendRef.current = room.send;
    namesRef.current = Object.fromEntries(joined.map((p) => [p.id, p.name]));
  });

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, hud.score, stage === "done");

  // Pelet awal dari seed yang sama di semua klien + pesan permainan.
  useEffect(() => {
    pellets.current = seedPellets(config.seed ?? 1);
    rivals.current = {};
    const nameOf = (id: string) => namesRef.current[id] ?? "Pemain";
    return room.subscribe((m) => {
      switch (m.t) {
        case "snk":
          if (m.id !== me.id) rivals.current[m.id] = { a: m.a, b: m.b, len: m.len, seg: m.seg, rx: nowMs() };
          break;
        case "eat":
          m.f.forEach((id) => pellets.current.delete(id));
          break;
        case "food":
          for (let i = 0; i + 3 < m.f.length; i += 4) pellets.current.set(m.f[i], { x: m.f[i + 1], y: m.f[i + 2], v: m.f[i + 3] });
          break;
        case "dead": {
          delete rivals.current[m.id];
          for (let i = 0; i + 3 < m.f.length; i += 4) pellets.current.set(m.f[i], { x: m.f[i + 1], y: m.f[i + 2], v: m.f[i + 3] });
          if (m.by === me.id) scoreRef.current += KILL_POINTS;
          const line = m.by ? `${nameOf(m.by)} 💥 ${nameOf(m.id)}` : `${nameOf(m.id)} 💥`;
          setFeed((f) => [...f.slice(-2), line]);
          break;
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(
    () => {
      if (count <= 1) setStage("play");
      else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  // Host menambah pelet baru secara berkala.
  useInterval(
    () => {
      if (pellets.current.size >= FOOD_TARGET) return;
      const f: number[] = [];
      for (let i = 0; i < 4; i++) {
        f.push(nextFoodId.current++, Math.round(rnd(40, WORLD - 40)), Math.round(rnd(40, WORLD - 40)), Math.random() < 0.12 ? 3 : 1);
      }
      sendRef.current({ t: "food", f });
    },
    stage === "play" && isHost ? 700 : null,
  );

  // Loop permainan: simulasi, siaran, dan gambar.
  useEffect(() => {
    if (stage !== "play") return;
    const send = (msg: MpMessage) => sendRef.current(msg);
    const s = sim.current;
    startRef.current = nowMs();
    let last = startRef.current;
    let lastSend = 0;
    let lastProg = startRef.current;
    let lastHud = 0;
    let raf = 0;

    const spawn = (now: number) => {
      const x = rnd(250, WORLD - 250);
      const y = rnd(250, WORLD - 250);
      const ang = rnd(0, Math.PI * 2);
      const segs: number[] = [];
      for (let i = 0; i < START_LEN; i++) segs.push(x - Math.cos(ang) * SPACING * i, y - Math.sin(ang) * SPACING * i);
      Object.assign(s, { segs, angle: ang, target: ang, grow: 0, boostAcc: 0, alive: true, spawnedAt: now });
    };

    const die = (by: string, now: number) => {
      s.alive = false;
      s.respawnAt = now + RESPAWN_MS;
      cam.current = { x: s.segs[0], y: s.segs[1] };
      const drops: number[] = [];
      for (let i = 0; i < s.segs.length && drops.length < 160; i += 6) {
        drops.push(
          newFoodId(),
          Math.round(clamp(s.segs[i] + rnd(-8, 8), 10, WORLD - 10)),
          Math.round(clamp(s.segs[i + 1] + rnd(-8, 8), 10, WORLD - 10)),
          2,
        );
      }
      send({ t: "dead", id: me.id, by, f: drops });
    };

    const step = (dt: number, now: number) => {
      const segs = s.segs;
      s.angle += clamp(angleDiff(s.angle, s.target), -TURN_RATE * dt, TURN_RATE * dt);
      const boosting = s.boost && segs.length / 2 > MIN_BOOST_LEN;
      const speed = boosting ? BOOST_SPEED : BASE_SPEED;
      segs[0] = clamp(segs[0] + Math.cos(s.angle) * speed * dt, 0, WORLD);
      segs[1] = clamp(segs[1] + Math.sin(s.angle) * speed * dt, 0, WORLD);
      followBody(segs);

      if (boosting) {
        s.boostAcc += dt;
        if (s.boostAcc >= 0.22) {
          s.boostAcc = 0;
          segs.length -= 2;
        }
      }
      if (s.grow >= 1) {
        if (segs.length / 2 < MAX_LEN) segs.push(segs[segs.length - 2], segs[segs.length - 1]);
        s.grow -= 1;
      }

      const len = segs.length / 2;
      const hx = segs[0];
      const hy = segs[1];
      const R = snakeRadius(len) + 10;
      const eaten: number[] = [];
      pellets.current.forEach((p, id) => {
        if (Math.abs(p.x - hx) < R && Math.abs(p.y - hy) < R && Math.hypot(p.x - hx, p.y - hy) < R) {
          eaten.push(id);
          scoreRef.current += p.v * PELLET_POINTS;
          s.grow += p.v * 0.5;
        }
      });
      if (eaten.length) {
        eaten.forEach((id) => pellets.current.delete(id));
        send({ t: "eat", f: eaten });
      }

      if (now - s.spawnedAt < SPAWN_SHIELD_MS) return;
      const r = snakeRadius(len);
      for (const [id, rv] of Object.entries(rivals.current)) {
        if (now - rv.rx > STALE_MS) continue;
        const off = (Math.min(now - rv.rx, 250) / 1000) * (rv.b ? BOOST_SPEED : BASE_SPEED);
        const ox = Math.cos(rv.a) * off;
        const oy = Math.sin(rv.a) * off;
        const reach = r + snakeRadius(rv.len) * 0.8;
        for (let i = 0; i + 3 < rv.seg.length; i += 2) {
          if (pointSegDist(hx, hy, rv.seg[i] + ox, rv.seg[i + 1] + oy, rv.seg[i + 2] + ox, rv.seg[i + 3] + oy) < reach) {
            die(id, now);
            return;
          }
        }
      }
    };

    const drawSnake = (
      ctx: CanvasRenderingContext2D,
      pts: number[],
      ox: number,
      oy: number,
      len: number,
      hue: number,
      angle: number,
      name: string,
      mine: boolean,
    ) => {
      if (pts.length < 4) return;
      const r = snakeRadius(len);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = r * 2;
      ctx.strokeStyle = `hsl(${hue} 70% ${mine ? 52 : 46}%)`;
      ctx.beginPath();
      ctx.moveTo(pts[0] + ox, pts[1] + oy);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + ox, pts[i + 1] + oy);
      ctx.stroke();
      const hx = pts[0] + ox;
      const hy = pts[1] + oy;
      ctx.fillStyle = "#fff";
      for (const side of [-1, 1]) {
        const ex = hx + Math.cos(angle) * r * 0.45 + Math.cos(angle + (Math.PI / 2) * side) * r * 0.5;
        const ey = hy + Math.sin(angle) * r * 0.45 + Math.sin(angle + (Math.PI / 2) * side) * r * 0.5;
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(ex + Math.cos(angle) * r * 0.1, ey + Math.sin(angle) * r * 0.1, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
      }
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = mine ? "#fde68a" : "#e2e8f0";
      ctx.fillText(name, hx, hy - r - 6);
    };

    const draw = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const cx = s.alive ? s.segs[0] : cam.current.x;
      const cy = s.alive ? s.segs[1] : cam.current.y;
      const ox = VIEW_W / 2 - cx;
      const oy = VIEW_H / 2 - cy;

      ctx.fillStyle = "#070d1a";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#101a30";
      ctx.fillRect(ox, oy, WORLD, WORLD);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = 0; g <= WORLD; g += 100) {
        if (g + ox >= 0 && g + ox <= VIEW_W) {
          ctx.moveTo(g + ox, Math.max(0, oy));
          ctx.lineTo(g + ox, Math.min(VIEW_H, oy + WORLD));
        }
        if (g + oy >= 0 && g + oy <= VIEW_H) {
          ctx.moveTo(Math.max(0, ox), g + oy);
          ctx.lineTo(Math.min(VIEW_W, ox + WORLD), g + oy);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.strokeRect(ox, oy, WORLD, WORLD);

      pellets.current.forEach((p, id) => {
        const px = p.x + ox;
        const py = p.y + oy;
        if (px < -8 || px > VIEW_W + 8 || py < -8 || py > VIEW_H + 8) return;
        ctx.fillStyle = `hsl(${hueOf(id)} 85% 62%)`;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 + p.v, 0, Math.PI * 2);
        ctx.fill();
      });

      for (const [id, rv] of Object.entries(rivals.current)) {
        if (now - rv.rx > STALE_MS) continue;
        const off = (Math.min(now - rv.rx, 250) / 1000) * (rv.b ? BOOST_SPEED : BASE_SPEED);
        drawSnake(
          ctx,
          rv.seg,
          ox + Math.cos(rv.a) * off,
          oy + Math.sin(rv.a) * off,
          rv.len,
          hueOf(id),
          rv.a,
          namesRef.current[id] ?? "",
          false,
        );
      }
      if (s.alive) drawSnake(ctx, s.segs, ox, oy, s.segs.length / 2, hueOf(me.id), s.angle, "Kamu", true);
    };

    const finishMatch = () => {
      send({ t: "prog", id: me.id, score: scoreRef.current, n: 0, done: true });
      setHud((h) => ({ ...h, score: scoreRef.current, alive: s.alive, left: 0 }));
      setStage("done");
    };

    const frame = () => {
      const now = nowMs();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (now - startRef.current >= SLITHER_SECONDS * 1000) {
        finishMatch();
        return;
      }
      if (s.alive) step(dt, now);
      else if (now >= s.respawnAt) spawn(now);

      if (s.alive && now - lastSend >= SEND_MS) {
        lastSend = now;
        send({ t: "snk", id: me.id, a: Math.round(s.angle * 100) / 100, b: s.boost, len: s.segs.length / 2, seg: packBody(s.segs) });
      }
      if (now - lastProg >= 1000) {
        lastProg = now;
        send({ t: "prog", id: me.id, score: scoreRef.current, n: 0 });
      }
      if (now - lastHud >= 200) {
        lastHud = now;
        setHud({
          score: scoreRef.current,
          len: Math.round(s.segs.length / 2),
          alive: s.alive,
          left: Math.max(0, SLITHER_SECONDS - (now - startRef.current) / 1000),
        });
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    spawn(startRef.current);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      s.alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Kontrol keyboard: Spasi = ngebut, ←/→ atau A/D = belok.
  useEffect(() => {
    if (stage !== "play") return;
    const down = (e: KeyboardEvent) => {
      const s = sim.current;
      const k = e.key.toLowerCase();
      if (k === " ") {
        s.boost = true;
        e.preventDefault();
      } else if (k === "arrowleft" || k === "a") {
        s.target = s.angle - 0.5;
        e.preventDefault();
      } else if (k === "arrowright" || k === "d") {
        s.target = s.angle + 0.5;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") sim.current.boost = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [stage]);

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Kepala selalu di tengah layar, jadi arah = dari tengah kanvas ke penunjuk.
    sim.current.target = Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2));
  };

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        notice="Skor = pelet yang dimakan (x10) + 100 per ular yang kamu tabrakkan."
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.slither.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Slither Arena</h3>
        <p className="mt-1 text-sm text-slate-500">
          Arahkan ular dengan mouse/jari, makan pelet, dan jebak lawan agar menabrak badanmu!
        </p>
        <p className="mt-4 text-7xl font-black text-indigo-600 animate-lb-pop" key={count}>
          {count}
        </p>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-md mx-auto text-center py-4">
        <p className="text-lg font-black text-slate-900">⏱ Waktu habis! Menunggu hasil akhir…</p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{hud.score}</span>
        </span>
        <span className="text-slate-500">🐍 {hud.len}</span>
        <span className={hud.left < 15 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(hud.left)}s</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          onPointerDown={aim}
          onPointerMove={aim}
          className="w-full aspect-[8/5] touch-none cursor-crosshair rounded-2xl border-2 border-slate-700 bg-slate-950"
        />
        {!hud.alive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <p className="text-lg font-black text-white">💀 Kamu dimakan! Respawn sebentar lagi…</p>
          </div>
        )}
        <div className="pointer-events-none absolute left-2 top-2 space-y-0.5 text-[11px] font-bold text-white/80">
          {feed.map((f, i) => (
            <p key={i}>{f}</p>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          Arahkan dengan mouse/jari · tahan <b>Spasi</b> atau tombol ⚡ untuk ngebut (ekor memendek)
        </p>
        <button
          type="button"
          onPointerDown={() => (sim.current.boost = true)}
          onPointerUp={() => (sim.current.boost = false)}
          onPointerLeave={() => (sim.current.boost = false)}
          onPointerCancel={() => (sim.current.boost = false)}
          className="shrink-0 select-none rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-black text-white shadow active:scale-95"
        >
          ⚡ Ngebut
        </button>
      </div>

      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
