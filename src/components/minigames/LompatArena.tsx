"use client";

// Arena Lompat Rintangan — tampilan bersama untuk solo & bareng.

import { LOMPAT_PLAYER_X, lompatHeight, type LompatItem } from "@/lib/lompat";

export function LompatArena({
  items,
  jump,
  onJump,
}: {
  items: LompatItem[];
  /** Posisi lompatan (tick); < 0 = di tanah. */
  jump: number;
  onJump: () => void;
}) {
  const h = lompatHeight(jump);
  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onJump}
      className="relative h-52 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 to-sky-50 border border-sky-200 cursor-pointer touch-none"
    >
      <div className="absolute inset-x-0 bottom-0 h-8 bg-amber-200 border-t-2 border-amber-300" />
      {items.map((it) => (
        <div
          key={it.id}
          className="absolute -translate-x-1/2 text-3xl leading-none"
          style={{ left: `${it.x}%`, bottom: it.star ? "5.5rem" : "1.6rem" }}
        >
          {it.star ? "⭐" : "🌵"}
        </div>
      ))}
      <div
        className="absolute -translate-x-1/2 text-4xl leading-none"
        style={{ left: `${LOMPAT_PLAYER_X}%`, bottom: `calc(1.6rem + ${h * 4.5}rem)` }}
      >
        🦖
      </div>
      <p className="absolute right-3 top-2 text-[11px] font-bold text-sky-700/70">Tap / Spasi / ↑ untuk lompat</p>
    </div>
  );
}
