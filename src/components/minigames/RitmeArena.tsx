"use client";

// Arena Ritme Tap — tampilan bersama untuk solo & bareng.

import { useEffect } from "react";
import { RITME_HIT_Y, type RitmeFalling } from "@/lib/ritme";
import type { RitmeFlash } from "./useRitme";

const LANE_STYLE = ["bg-rose-500", "bg-amber-400", "bg-emerald-500", "bg-sky-500"];
const KEYS = ["d", "f", "j", "k"];

export function RitmeArena({
  notes,
  flash,
  combo,
  active,
  onTap,
}: {
  notes: RitmeFalling[];
  flash: RitmeFlash | null;
  combo: number;
  active: boolean;
  onTap: (lane: number) => void;
}) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const i = KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0 && !e.repeat) {
        e.preventDefault();
        onTap(i);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onTap]);

  return (
    <div className="select-none">
      <div className="relative h-72 overflow-hidden rounded-2xl bg-slate-900">
        <div className="absolute inset-0 grid grid-cols-4">
          {LANE_STYLE.map((_, i) => (
            <div key={i} className={`border-r border-white/10 ${flash?.lane === i ? "bg-white/10" : ""}`} />
          ))}
        </div>
        <div className="absolute inset-x-0 border-t-2 border-white/60" style={{ top: `${RITME_HIT_Y}%` }} />
        {notes.map((n) => (
          <div
            key={n.id}
            className={`absolute h-5 w-[calc(25%-8px)] rounded-md ${LANE_STYLE[n.lane]} shadow`}
            style={{ left: `calc(${n.lane * 25}% + 4px)`, top: `${n.y}%` }}
          />
        ))}
        {flash && (
          <p
            className={`absolute left-1/2 top-[55%] -translate-x-1/2 text-lg font-black ${
              flash.kind === "perfect" ? "text-yellow-300" : flash.kind === "good" ? "text-emerald-300" : "text-red-400"
            }`}
          >
            {flash.kind === "perfect" ? "PERFECT!" : flash.kind === "good" ? "Bagus" : "Meleset"}
          </p>
        )}
        {combo >= 3 && <p className="absolute right-3 top-2 text-sm font-black text-white/80">🔥 x{combo}</p>}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {LANE_STYLE.map((cls, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={() => onTap(i)}
            className={`h-16 rounded-xl ${cls} text-lg font-black text-white shadow active:scale-90 transition touch-none`}
          >
            {KEYS[i].toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
