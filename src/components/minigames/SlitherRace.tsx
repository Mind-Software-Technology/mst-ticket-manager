"use client";

// =====================================================
// SlitherRace — Slither Arena (multiplayer, gaya slither.io)
//
// Arena besar berisi pelet makanan dan ular bot. Gerakkan ular dengan
// mouse/jari, makan pelet supaya makin panjang & gemuk (kamera ikut
// menjauh), tabrakkan kepalamu ke badan ular lain = ular itu mati dan
// menjatuhkan pelet (+100 poin untukmu). Menabrak badan ular lain =
// kamu mati, tapi bisa respawn. Penanda & minimap menunjukkan lokasi teman.
//
// Tanpa server game: tiap klien mensimulasikan ularnya sendiri dan
// menyiarkan posisinya lewat pesan `snk`. Bot disimulasikan host dan
// disiarkan dalam pesan `snk` host yang sama (lihat lib/slither.ts).
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import {
  BASE_SPEED,
  BOOST_SPEED,
  BOT_COUNT,
  BOT_PREFIX,
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
  botName,
  followBody,
  hueOf,
  isBot,
  packBody,
  pointSegDist,
  seedPellets,
  snakeRadius,
  viewScale,
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

/** Ular yang dikendalikan lokal: pemain sendiri, atau bot (hanya di host). */
interface Snake {
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
interface Bot extends Snake {
  id: string;
  think: number;
}

/** Rintangan bagi bot: badan ular lain dalam koordinat dunia (sudah dikoreksi prediksi). */
interface Obstacle {
  id: string;
  pts: number[];
  ox: number;
  oy: number;
  r: number;
}

interface FriendChip {
  id: string;
  name: string;
  /** Jarak dalam "meter" (1m = 10 unit dunia). */
  dist: number;
  /** Panah arah mata angin dari ularmu ke teman. */
  dir: string;
}

interface Hud {
  score: number;
  len: number;
  alive: boolean;
  left: number;
  friends: FriendChip[];
}

const DIRS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const dirArrow = (ang: number) => DIRS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];

const COUNTDOWN = 3;
const RESPAWN_MS = 2500;
const BOT_RESPAWN_MS = 3000;
const SPAWN_SHIELD_MS = 1500;
const STALE_MS = 3000;
const BOT_SPEED = BASE_SPEED * 0.92;
const MINIMAP = 120;

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const newFoodId = () => 1_000_000 + Math.floor(Math.random() * 1_000_000_000);

const makeBody = (x: number, y: number, ang: number) => {
  const segs: number[] = [];
  for (let i = 0; i < START_LEN; i++) segs.push(x - Math.cos(ang) * SPACING * i, y - Math.sin(ang) * SPACING * i);
  return segs;
};

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
  const [hud, setHud] = useState<Hud>({ score: 0, len: START_LEN, alive: true, left: SLITHER_SECONDS, friends: [] });
  const [feed, setFeed] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pellets = useRef<Map<number, Pellet>>(new Map());
  const rivals = useRef<Record<string, Rival>>({});
  const sim = useRef<Snake>({
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
  const cam = useRef({ x: WORLD / 2, y: WORLD / 2, scale: 1 });
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
    const nameOf = (id: string) => (isBot(id) ? botName(id) : (namesRef.current[id] ?? "Pemain"));
    const addFood = (f: number[]) => {
      for (let i = 0; i + 3 < f.length; i += 4) pellets.current.set(f[i], { x: f[i + 1], y: f[i + 2], v: f[i + 3] });
    };
    return room.subscribe((m) => {
      switch (m.t) {
        case "snk": {
          const now = nowMs();
          if (m.id !== me.id && m.seg.length >= 4) rivals.current[m.id] = { a: m.a, b: m.b, len: m.len, seg: m.seg, rx: now };
          m.bots?.forEach((b) => {
            if (b.seg.length >= 4) rivals.current[b.id] = { a: b.a, b: false, len: b.len, seg: b.seg, rx: now };
          });
          break;
        }
        case "eat":
          m.f.forEach((id) => pellets.current.delete(id));
          break;
        case "food":
          addFood(m.f);
          break;
        case "dead": {
          delete rivals.current[m.id];
          addFood(m.f);
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

  // Host menambah pelet baru secara berkala (arena besar = lebih banyak pelet).
  useInterval(
    () => {
      if (pellets.current.size >= FOOD_TARGET) return;
      const f: number[] = [];
      for (let i = 0; i < 8; i++) {
        f.push(nextFoodId.current++, Math.round(rnd(40, WORLD - 40)), Math.round(rnd(40, WORLD - 40)), Math.random() < 0.12 ? 3 : 1);
      }
      sendRef.current({ t: "food", f });
    },
    stage === "play" && isHost ? 700 : null,
  );

  // Loop permainan: simulasi, bot (host), siaran, dan gambar.
  useEffect(() => {
    if (stage !== "play") return;
    const send = (msg: MpMessage) => sendRef.current(msg);
    const s = sim.current;
    const c = cam.current;
    startRef.current = nowMs();
    let last = startRef.current;
    let lastSend = 0;
    let lastProg = startRef.current;
    let lastHud = 0;
    let raf = 0;

    const bots: Bot[] = isHost
      ? Array.from({ length: BOT_COUNT }, (_, i) => ({
          id: `${BOT_PREFIX}${i}`,
          segs: [],
          angle: 0,
          target: 0,
          boost: false,
          grow: 0,
          boostAcc: 0,
          alive: false,
          respawnAt: startRef.current + 500 * i,
          spawnedAt: 0,
          think: 0,
        }))
      : [];

    const dropFood = (segs: number[]): number[] => {
      const len = segs.length / 2;
      const value = clamp(Math.round(len / 60) + 1, 2, 6);
      const stride = Math.max(6, 2 * Math.ceil(len / 40));
      const drops: number[] = [];
      for (let i = 0; i < segs.length; i += stride) {
        drops.push(
          newFoodId(),
          Math.round(clamp(segs[i] + rnd(-8, 8), 10, WORLD - 10)),
          Math.round(clamp(segs[i + 1] + rnd(-8, 8), 10, WORLD - 10)),
          value,
        );
      }
      return drops;
    };

    /** Awal: pemain tersebar di lingkaran kecil di tengah arena supaya langsung saling lihat. Respawn: dekat salah satu teman. */
    const spawn = (now: number, initial = false) => {
      let x = rnd(300, WORLD - 300);
      let y = rnd(300, WORLD - 300);
      let ang = rnd(0, Math.PI * 2);
      if (initial) {
        const idx = Math.max(0, joined.findIndex((p) => p.id === me.id));
        const around = (idx / Math.max(1, joined.length)) * Math.PI * 2;
        x = WORLD / 2 + Math.cos(around) * 200;
        y = WORLD / 2 + Math.sin(around) * 200;
        ang = around + Math.PI;
      } else {
        const mates = Object.entries(rivals.current).filter(([id, rv]) => !isBot(id) && now - rv.rx <= STALE_MS);
        if (mates.length) {
          const [, rv] = mates[Math.floor(Math.random() * mates.length)];
          const a = rnd(0, Math.PI * 2);
          const d = rnd(250, 450);
          x = clamp(rv.seg[0] + Math.cos(a) * d, 300, WORLD - 300);
          y = clamp(rv.seg[1] + Math.sin(a) * d, 300, WORLD - 300);
        }
      }
      Object.assign(s, { segs: makeBody(x, y, ang), angle: ang, target: ang, grow: 0, boostAcc: 0, alive: true, spawnedAt: now });
    };

    const die = (by: string, now: number) => {
      s.alive = false;
      s.respawnAt = now + RESPAWN_MS;
      c.x = s.segs[0];
      c.y = s.segs[1];
      send({ t: "dead", id: me.id, by, f: dropFood(s.segs) });
    };

    /** Gerak umum: belok, maju, badan mengikuti, tumbuh. Return jumlah ruas. */
    const advance = (u: Snake, dt: number, speed: number) => {
      u.angle += clamp(angleDiff(u.angle, u.target), -TURN_RATE * dt, TURN_RATE * dt);
      u.segs[0] = clamp(u.segs[0] + Math.cos(u.angle) * speed * dt, 0, WORLD);
      u.segs[1] = clamp(u.segs[1] + Math.sin(u.angle) * speed * dt, 0, WORLD);
      followBody(u.segs);
      if (u.grow >= 1) {
        if (u.segs.length / 2 < MAX_LEN) u.segs.push(u.segs[u.segs.length - 2], u.segs[u.segs.length - 1]);
        u.grow -= 1;
      }
      return u.segs.length / 2;
    };

    /** Makan pelet di sekitar kepala; return poin yang didapat. */
    const eat = (u: Snake): number => {
      const R = snakeRadius(u.segs.length / 2) + 10;
      const hx = u.segs[0];
      const hy = u.segs[1];
      const eaten: number[] = [];
      let points = 0;
      pellets.current.forEach((p, id) => {
        if (Math.abs(p.x - hx) < R && Math.abs(p.y - hy) < R && Math.hypot(p.x - hx, p.y - hy) < R) {
          eaten.push(id);
          points += p.v * PELLET_POINTS;
          u.grow += p.v * 0.7;
        }
      });
      if (eaten.length) {
        eaten.forEach((id) => pellets.current.delete(id));
        send({ t: "eat", f: eaten });
      }
      return points;
    };

    /** Rintangan sekarang (selain `except`): pemain, ular lain, dan bot. */
    const obstaclesFor = (except: string, now: number): Obstacle[] => {
      const out: Obstacle[] = [];
      if (except !== me.id && s.alive) out.push({ id: me.id, pts: s.segs, ox: 0, oy: 0, r: snakeRadius(s.segs.length / 2) });
      for (const [id, rv] of Object.entries(rivals.current)) {
        if (id === except || isBot(id) || now - rv.rx > STALE_MS) continue;
        const off = (Math.min(now - rv.rx, 250) / 1000) * (rv.b ? BOOST_SPEED : BASE_SPEED);
        out.push({ id, pts: rv.seg, ox: Math.cos(rv.a) * off, oy: Math.sin(rv.a) * off, r: snakeRadius(rv.len) });
      }
      for (const b of bots) {
        if (b.id !== except && b.alive) out.push({ id: b.id, pts: b.segs, ox: 0, oy: 0, r: snakeRadius(b.segs.length / 2) });
      }
      return out;
    };

    /** Jarak (dikurangi radius) titik ke rintangan terdekat. */
    const clearance = (px: number, py: number, obst: Obstacle[]): number => {
      let best = Infinity;
      for (const o of obst) {
        for (let i = 0; i + 3 < o.pts.length; i += 2) {
          const d = pointSegDist(px, py, o.pts[i] + o.ox, o.pts[i + 1] + o.oy, o.pts[i + 2] + o.ox, o.pts[i + 3] + o.oy) - o.r;
          if (d < best) best = d;
        }
      }
      return best;
    };

    const hitBy = (hx: number, hy: number, r: number, obst: Obstacle[]): string | null => {
      for (const o of obst) {
        const reach = r + o.r * 0.8;
        for (let i = 0; i + 3 < o.pts.length; i += 2) {
          if (pointSegDist(hx, hy, o.pts[i] + o.ox, o.pts[i + 1] + o.oy, o.pts[i + 2] + o.ox, o.pts[i + 3] + o.oy) < reach) return o.id;
        }
      }
      return null;
    };

    const step = (dt: number, now: number) => {
      const boosting = s.boost && s.segs.length / 2 > MIN_BOOST_LEN;
      const len = advance(s, dt, boosting ? BOOST_SPEED : BASE_SPEED);
      if (boosting) {
        s.boostAcc += dt;
        if (s.boostAcc >= 0.22) {
          s.boostAcc = 0;
          s.segs.length -= 2;
        }
      }
      scoreRef.current += eat(s);
      if (now - s.spawnedAt < SPAWN_SHIELD_MS) return;
      const killer = hitBy(s.segs[0], s.segs[1], snakeRadius(len), obstaclesFor(me.id, now));
      if (killer) die(killer, now);
    };

    // ── Bot (hanya host) ──
    const think = (b: Bot, obst: Obstacle[]) => {
      const hx = b.segs[0];
      const hy = b.segs[1];
      const edge = 260;
      if (hx < edge || hx > WORLD - edge || hy < edge || hy > WORLD - edge) {
        b.target = Math.atan2(WORLD / 2 - hy, WORLD / 2 - hx);
      } else {
        let near: Pellet | null = null;
        let bd = 420 * 420;
        pellets.current.forEach((p) => {
          const d = (p.x - hx) ** 2 + (p.y - hy) ** 2;
          if (d < bd) {
            bd = d;
            near = p;
          }
        });
        const target = near as Pellet | null;
        b.target = target ? Math.atan2(target.y - hy, target.x - hx) : b.angle + rnd(-0.9, 0.9);
      }
      // Menghindari badan ular lain di depan.
      const myR = snakeRadius(b.segs.length / 2);
      const ahead = clearance(hx + Math.cos(b.angle) * 70, hy + Math.sin(b.angle) * 70, obst);
      if (ahead < myR + 18) {
        const l = clearance(hx + Math.cos(b.angle - 0.9) * 70, hy + Math.sin(b.angle - 0.9) * 70, obst);
        const r = clearance(hx + Math.cos(b.angle + 0.9) * 70, hy + Math.sin(b.angle + 0.9) * 70, obst);
        b.target = b.angle + (l > r ? -1.3 : 1.3);
      }
    };

    const killBot = (b: Bot, by: string, now: number) => {
      b.alive = false;
      b.respawnAt = now + BOT_RESPAWN_MS;
      send({ t: "dead", id: b.id, by, f: dropFood(b.segs) });
    };

    const stepBots = (dt: number, now: number) => {
      for (const b of bots) {
        if (!b.alive) {
          if (now >= b.respawnAt) {
            const ang = rnd(0, Math.PI * 2);
            Object.assign(b, { segs: makeBody(rnd(300, WORLD - 300), rnd(300, WORLD - 300), ang), angle: ang, target: ang, grow: 0, alive: true, spawnedAt: now });
          }
          continue;
        }
        const obst = obstaclesFor(b.id, now);
        if (now >= b.think) {
          b.think = now + 250 + Math.random() * 150;
          think(b, obst);
        }
        const len = advance(b, dt, BOT_SPEED);
        eat(b);
        if (now - b.spawnedAt < SPAWN_SHIELD_MS) continue;
        const killer = hitBy(b.segs[0], b.segs[1], snakeRadius(len), obst);
        if (killer) killBot(b, killer, now);
      }
    };

    // ── Gambar ──
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
      sc: number,
      friend: boolean,
    ) => {
      if (pts.length < 4) return;
      const r = snakeRadius(len);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0] + ox, pts[1] + oy);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + ox, pts[i + 1] + oy);
      if (friend) {
        // Sorotan putih tipis supaya ular teman mudah dibedakan dari bot.
        ctx.lineWidth = r * 2 + 6 / sc;
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.stroke();
      }
      ctx.lineWidth = r * 2;
      ctx.strokeStyle = `hsl(${hue} 70% ${mine ? 52 : 46}%)`;
      ctx.stroke();
      const hx = pts[0] + ox;
      const hy = pts[1] + oy;
      for (const side of [-1, 1]) {
        const ex = hx + Math.cos(angle) * r * 0.45 + Math.cos(angle + (Math.PI / 2) * side) * r * 0.5;
        const ey = hy + Math.sin(angle) * r * 0.45 + Math.sin(angle + (Math.PI / 2) * side) * r * 0.5;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ex, ey, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(ex + Math.cos(angle) * r * 0.1, ey + Math.sin(angle) * r * 0.1, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = `bold ${12 / sc}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = mine ? "#fde68a" : "#e2e8f0";
      ctx.fillText(name, hx, hy - r - 6 / sc);
    };

    const draw = (now: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const cx = s.alive ? s.segs[0] : c.x;
      const cy = s.alive ? s.segs[1] : c.y;
      c.x = cx;
      c.y = cy;
      c.scale += (viewScale(s.alive ? s.segs.length / 2 : START_LEN) - c.scale) * 0.06;
      const sc = c.scale;
      const hw = VIEW_W / 2 / sc;
      const hh = VIEW_H / 2 / sc;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#070d1a";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // Dunia (koordinat dunia, kamera di tengah)
      ctx.setTransform(sc, 0, 0, sc, VIEW_W / 2 - cx * sc, VIEW_H / 2 - cy * sc);
      ctx.fillStyle = "#101a30";
      ctx.fillRect(0, 0, WORLD, WORLD);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1 / sc;
      ctx.beginPath();
      const gx0 = Math.max(0, Math.floor((cx - hw) / 100) * 100);
      const gx1 = Math.min(WORLD, cx + hw);
      const gy0 = Math.max(0, Math.floor((cy - hh) / 100) * 100);
      const gy1 = Math.min(WORLD, cy + hh);
      for (let g = gx0; g <= gx1; g += 100) {
        ctx.moveTo(g, gy0);
        ctx.lineTo(g, gy1);
      }
      for (let g = gy0; g <= gy1; g += 100) {
        ctx.moveTo(gx0, g);
        ctx.lineTo(gx1, g);
      }
      ctx.stroke();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 6 / sc;
      ctx.strokeRect(0, 0, WORLD, WORLD);

      pellets.current.forEach((p, id) => {
        if (Math.abs(p.x - cx) > hw + 10 || Math.abs(p.y - cy) > hh + 10) return;
        ctx.fillStyle = `hsl(${hueOf(id)} 85% 62%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 + Math.min(p.v, 6) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      const friends: Array<{ id: string; x: number; y: number }> = [];
      for (const [id, rv] of Object.entries(rivals.current)) {
        if (now - rv.rx > STALE_MS) continue;
        const off = (Math.min(now - rv.rx, 250) / 1000) * (rv.b ? BOOST_SPEED : BASE_SPEED);
        const ox = Math.cos(rv.a) * off;
        const oy = Math.sin(rv.a) * off;
        drawSnake(ctx, rv.seg, ox, oy, rv.len, hueOf(id), rv.a, isBot(id) ? botName(id) : `👥 ${namesRef.current[id] ?? ""}`, false, sc, !isBot(id));
        friends.push({ id, x: rv.seg[0] + ox, y: rv.seg[1] + oy });
      }
      if (s.alive) drawSnake(ctx, s.segs, 0, 0, s.segs.length / 2, hueOf(me.id), s.angle, "Kamu", true, sc, false);

      // Overlay layar (koordinat piksel)
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Panah penanda teman di luar layar
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      for (const f of friends) {
        if (isBot(f.id)) continue;
        const dx = f.x - cx;
        const dy = f.y - cy;
        const sx = VIEW_W / 2 + dx * sc;
        const sy = VIEW_H / 2 + dy * sc;
        if (sx > 12 && sx < VIEW_W - 12 && sy > 12 && sy < VIEW_H - 12) continue;
        const ang = Math.atan2(dy, dx);
        const t = Math.min((VIEW_W / 2 - 30) / Math.max(Math.abs(Math.cos(ang)), 1e-3), (VIEW_H / 2 - 30) / Math.max(Math.abs(Math.sin(ang)), 1e-3));
        const px = VIEW_W / 2 + Math.cos(ang) * t;
        const py = VIEW_H / 2 + Math.sin(ang) * t;
        const color = `hsl(${hueOf(f.id)} 80% 62%)`;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(ang);
        ctx.fillStyle = color;
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-7, -7);
        ctx.lineTo(-7, 7);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.restore();
        const label = `${namesRef.current[f.id] ?? ""} ${Math.round(Math.hypot(dx, dy) / 10)}m`;
        ctx.fillStyle = "#0f172a";
        ctx.fillText(label, px - Math.cos(ang) * 30 + 1, py - Math.sin(ang) * 18 + 1);
        ctx.fillStyle = color;
        ctx.fillText(label, px - Math.cos(ang) * 30, py - Math.sin(ang) * 18);
      }

      // Minimap
      const mx = VIEW_W - MINIMAP - 8;
      const my = 8;
      const k = MINIMAP / WORLD;
      ctx.fillStyle = "rgba(2,6,23,0.65)";
      ctx.fillRect(mx, my, MINIMAP, MINIMAP);
      ctx.strokeStyle = "rgba(248,250,252,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, MINIMAP, MINIMAP);
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.strokeRect(mx + (cx - hw) * k, my + (cy - hh) * k, hw * 2 * k, hh * 2 * k);
      for (const f of friends) {
        const bot = isBot(f.id);
        ctx.fillStyle = bot ? "rgba(148,163,184,0.7)" : `hsl(${hueOf(f.id)} 85% 62%)`;
        ctx.beginPath();
        ctx.arc(mx + clamp(f.x, 0, WORLD) * k, my + clamp(f.y, 0, WORLD) * k, bot ? 1.6 : 3.2, 0, Math.PI * 2);
        ctx.fill();
        if (!bot) {
          ctx.fillStyle = "#f8fafc";
          ctx.font = "bold 8px sans-serif";
          ctx.fillText((namesRef.current[f.id] ?? "?").charAt(0).toUpperCase(), mx + clamp(f.x, 0, WORLD) * k, my + clamp(f.y, 0, WORLD) * k - 5);
        }
      }
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(mx + cx * k, my + cy * k, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
      if (isHost) stepBots(dt, now);

      if (now - lastSend >= SEND_MS && (s.alive || isHost)) {
        lastSend = now;
        send({
          t: "snk",
          id: me.id,
          a: Math.round(s.angle * 100) / 100,
          b: s.boost,
          len: s.segs.length / 2,
          seg: s.alive ? packBody(s.segs) : [],
          bots: isHost
            ? bots
                .filter((b) => b.alive)
                .map((b) => ({ id: b.id, a: Math.round(b.angle * 100) / 100, len: b.segs.length / 2, seg: packBody(b.segs, 4) }))
            : undefined,
        });
      }
      if (now - lastProg >= 1000) {
        lastProg = now;
        send({ t: "prog", id: me.id, score: scoreRef.current, n: 0 });
      }
      if (now - lastHud >= 200) {
        lastHud = now;
        const friends: FriendChip[] = [];
        for (const [id, rv] of Object.entries(rivals.current)) {
          if (isBot(id) || now - rv.rx > STALE_MS) continue;
          const dx = rv.seg[0] - c.x;
          const dy = rv.seg[1] - c.y;
          friends.push({ id, name: namesRef.current[id] ?? "Teman", dist: Math.round(Math.hypot(dx, dy) / 10), dir: dirArrow(Math.atan2(dy, dx)) });
        }
        friends.sort((a, b) => a.dist - b.dist);
        setHud({
          score: scoreRef.current,
          len: Math.round(s.segs.length / 2),
          alive: s.alive,
          left: Math.max(0, SLITHER_SECONDS - (now - startRef.current) / 1000),
          friends,
        });
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    spawn(startRef.current, true);
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
        notice="Skor = pelet yang dimakan (x10) + 100 per ular (pemain atau bot) yang kamu jebak."
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
          Arahkan ular dengan mouse/jari, makan pelet sampai besar, dan jebak ular lain (termasuk bot 🤖) agar menabrak badanmu!
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
          Arahkan dengan mouse/jari · tahan <b>Spasi</b> atau tombol ⚡ untuk ngebut · panah &amp; minimap menunjukkan posisi teman
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

      <div className="mt-2 flex flex-wrap gap-1.5">
        {hud.friends.length === 0 ? (
          <span className="text-[11px] text-slate-400">Belum ada teman yang terlihat di arena.</span>
        ) : (
          hud.friends.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${hueOf(f.id)} 80% 55%)` }} />
              {f.name}
              <span className="text-slate-400">
                {f.dir} {f.dist}m
              </span>
            </span>
          ))
        )}
      </div>

      <div className="mt-3">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
