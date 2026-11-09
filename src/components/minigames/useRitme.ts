"use client";

// Mesin Ritme Tap: dipakai versi solo & bareng supaya aturannya identik.

import { useEffect, useRef, useState } from "react";
import {
  RITME_GOOD_WINDOW,
  RITME_HIT_Y,
  RITME_MAX_TICKS,
  RITME_MISS_Y,
  RITME_SPEED,
  RITME_TICK_MS,
  ritmePoints,
  type RitmeFalling,
  type RitmeNote,
} from "@/lib/ritme";
import { useInterval } from "./GameParts";

export interface RitmeFlash {
  lane: number;
  kind: "perfect" | "good" | "miss";
  until: number;
}

export function useRitme(
  chart: RitmeNote[],
  active: boolean,
  cb: { onChange?: (score: number) => void; onEnd: (score: number) => void },
) {
  const [notes, setNotes] = useState<RitmeFalling[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<RitmeFlash | null>(null);

  const notesRef = useRef<RitmeFalling[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestRef = useRef(0);
  const ticksRef = useRef(0);
  const nextRef = useRef(0);
  const idRef = useRef(0);
  const endedRef = useRef(false);
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });

  const bump = (s: number, c: number) => {
    scoreRef.current = s;
    comboRef.current = c;
    if (c > bestRef.current) bestRef.current = c;
    setScore(s);
    setCombo(c);
    setBest(bestRef.current);
  };

  const tap = (lane: number) => {
    if (!active || endedRef.current) return;
    let target: RitmeFalling | null = null;
    for (const n of notesRef.current) {
      if (n.lane !== lane || Math.abs(n.y - RITME_HIT_Y) > RITME_GOOD_WINDOW) continue;
      if (!target || Math.abs(n.y - RITME_HIT_Y) < Math.abs(target.y - RITME_HIT_Y)) target = n;
    }
    const until = ticksRef.current + 4;
    if (!target) {
      bump(scoreRef.current, 0);
      setFlash({ lane, kind: "miss", until });
      return;
    }
    const hit = target;
    const dist = Math.abs(hit.y - RITME_HIT_Y);
    const nextCombo = comboRef.current + 1;
    notesRef.current = notesRef.current.filter((n) => n.id !== hit.id);
    setNotes(notesRef.current);
    bump(scoreRef.current + ritmePoints(dist, nextCombo), nextCombo);
    setFlash({ lane, kind: dist <= 4.5 ? "perfect" : "good", until });
    cbRef.current.onChange?.(scoreRef.current);
  };

  useInterval(
    () => {
      if (endedRef.current) return;
      ticksRef.current += 1;
      const t = ticksRef.current;
      while (nextRef.current < chart.length && chart[nextRef.current][0] <= t) {
        notesRef.current.push({ id: idRef.current++, lane: chart[nextRef.current][1], y: 0 });
        nextRef.current += 1;
      }
      let missed = false;
      notesRef.current = notesRef.current
        .map((n) => ({ ...n, y: n.y + RITME_SPEED }))
        .filter((n) => {
          if (n.y > RITME_MISS_Y) {
            missed = true;
            return false;
          }
          return true;
        });
      setNotes(notesRef.current);
      if (missed) bump(scoreRef.current, 0);
      setFlash((f) => (f && t >= f.until ? null : f));
      if (t % 25 === 0) cbRef.current.onChange?.(scoreRef.current);
      if (t >= RITME_MAX_TICKS) {
        endedRef.current = true;
        cbRef.current.onEnd(scoreRef.current);
      }
    },
    active ? RITME_TICK_MS : null,
  );

  return { notes, score, combo, best, flash, tap };
}
