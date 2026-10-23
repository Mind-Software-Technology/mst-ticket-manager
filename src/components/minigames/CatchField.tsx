"use client";

// =====================================================
// CatchField — arena Tangkap Buah (dipakai solo & multiplayer)
//
// Jadwal jatuh sudah ditentukan (sama untuk semua pemain di mode bareng),
// jadi hasil tiap pemain hanya bergantung pada kemampuannya menangkap.
// Geser keranjang dengan mouse/jari, atau panah / A D.
// =====================================================

import { useEffect, useRef } from "react";
import { BUAH_FRUITS, buahFall, type BuahItem } from "@/lib/mp-content";

const W = 360;
const H = 480;
const BASKET_Y = H - 44;
const CATCH_HALF = 12; // % lebar
const KEY_SPEED = 95; // % per detik

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

export type CatchKind = 0 | 1 | 2;

export function CatchField({
  schedule,
  seconds,
  active,
  onCatch,
  onTick,
  onDone,
}: {
  schedule: readonly BuahItem[];
  seconds: number;
  active: boolean;
  /** Dipanggil tiap barang tertangkap: buah +10, bintang +30, bom -20. */
  onCatch: (pts: number, kind: CatchKind) => void;
  onTick?: (secondsLeft: number) => void;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bx = useRef(50);
  const keys = useRef<Set<string>>(new Set());
  const cb = useRef({ onCatch, onTick, onDone });
  const flash = useRef({ until: 0, color: "" });

  useEffect(() => {
    cb.current = { onCatch, onTick, onDone };
  });

  useEffect(() => {
    if (!active) return;
    const start = nowMs();
    const resolved = new Uint8Array(schedule.length);
    let last = start;
    let lastTick = 0;
    let raf = 0;

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d"].includes(k)) {
        if (down) keys.current.add(k);
        else keys.current.delete(k);
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    const frame = () => {
      const now = nowMs();
      const t = now - start;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (t >= seconds * 1000) {
        cb.current.onTick?.(0);
        cb.current.onDone();
        return;
      }
      if (now - lastTick >= 200) {
        lastTick = now;
        cb.current.onTick?.(seconds - t / 1000);
      }

      const dir = (keys.current.has("arrowright") || keys.current.has("d") ? 1 : 0) - (keys.current.has("arrowleft") || keys.current.has("a") ? 1 : 0);
      if (dir) bx.current = Math.max(8, Math.min(92, bx.current + dir * KEY_SPEED * dt));

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#e0f2fe");
        grad.addColorStop(1, "#fef9c3");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "30px serif";
        if (now < flash.current.until) {
          ctx.fillStyle = flash.current.color;
          ctx.fillRect(0, 0, W, H);
          ctx.font = "30px serif";
        }

        for (let i = 0; i < schedule.length; i++) {
          const [at, x, kind, variant] = schedule[i];
          if (resolved[i] || t < at) continue;
          const y = (t - at) / buahFall(at);
          if (y >= 0.84 && y <= 1.02 && Math.abs(x - bx.current) <= CATCH_HALF) {
            resolved[i] = 1;
            const pts = kind === 2 ? -20 : kind === 1 ? 30 : 10;
            flash.current = { until: now + 140, color: kind === 2 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.15)" };
            cb.current.onCatch(pts, kind as CatchKind);
            continue;
          }
          if (y > 1.02) {
            resolved[i] = 1;
            continue;
          }
          ctx.fillText(kind === 2 ? "💣" : kind === 1 ? "⭐" : BUAH_FRUITS[variant], (x / 100) * W, y * BASKET_Y);
        }

        ctx.font = "44px serif";
        ctx.fillText("🧺", (bx.current / 100) * W, BASKET_Y + 4);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const pressed = keys.current;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      pressed.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    bx.current = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onPointerDown={aim}
      onPointerMove={aim}
      className="mx-auto w-full max-w-sm aspect-[3/4] touch-none cursor-ew-resize rounded-2xl border-2 border-slate-200 bg-sky-50"
    />
  );
}
