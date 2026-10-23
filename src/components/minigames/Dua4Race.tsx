"use client";

// =====================================================
// Dua4Race — Hitung 24 (multiplayer)
//
// 6 soal berisi 4 angka (dijamin bisa jadi 24), sama untuk semua pemain.
// Susun ekspresi dengan + − × ÷ dan kurung, pakai tiap angka tepat sekali.
// Benar = 150 + bonus kecepatan (maks +100). Soal buntu boleh dilewati.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { MP_MODES, type MpMessage, type MpPlayer, type StartPayload } from "@/lib/multiplayer";
import { DUA4_PUZZLES, DUA4_SECONDS, evalExpr } from "@/lib/mp-content";
import { FinalPodium, Scoreboard, useRaceSync } from "./MpParts";
import { useInterval } from "./GameParts";

type Stage = "countdown" | "play" | "done";
interface Token {
  text: string;
  /** Indeks angka di soal (hanya untuk token angka). */
  slot?: number;
}

const COUNTDOWN = 3;
const SPEED_WINDOW_S = 40;
const OPS: Array<{ text: string; label: string }> = [
  { text: "+", label: "+" },
  { text: "-", label: "−" },
  { text: "*", label: "×" },
  { text: "/", label: "÷" },
  { text: "(", label: "(" },
  { text: ")", label: ")" },
];

// Dibungkus agar jelas dipanggil dari event handler, bukan saat render.
const nowMs = () => Date.now();

interface RoomApi {
  players: MpPlayer[];
  send: (msg: MpMessage) => void;
  subscribe: (fn: (msg: MpMessage) => void) => () => void;
}

export function Dua4Race({
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
  const puzzles = config.puzzles ?? [];
  const joined = config.players;

  const [stage, setStage] = useState<Stage>("countdown");
  const [count, setCount] = useState(COUNTDOWN);
  const [idx, setIdx] = useState(0);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DUA4_SECONDS);
  const [note, setNote] = useState("");
  const [shake, setShake] = useState(false);

  const startRef = useRef(0);
  const puzzleStart = useRef(0);
  const scoreRef = useRef(0);
  const doneSent = useRef(false);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const { scores, finalized } = useRaceSync(room.subscribe, me.id, joined, score, stage === "done");

  const nums = puzzles[idx] ?? [];
  const used = new Set(tokens.flatMap((t) => (t.slot === undefined ? [] : [t.slot])));

  const finish = () => {
    if (doneSent.current) return;
    doneSent.current = true;
    setStage("done");
    room.send({ t: "prog", id: me.id, score: scoreRef.current, n: idx, done: true });
  };

  useInterval(
    () => {
      if (count <= 1) {
        startRef.current = nowMs();
        puzzleStart.current = nowMs();
        setStage("play");
      } else setCount((c) => c - 1);
    },
    stage === "countdown" ? 1000 : null,
  );

  useInterval(
    () => {
      const left = DUA4_SECONDS - (nowMs() - startRef.current) / 1000;
      if (left <= 0) {
        setTimeLeft(0);
        finish();
      } else setTimeLeft(left);
    },
    stage === "play" ? 200 : null,
  );

  const advance = () => {
    setTokens([]);
    if (idx + 1 >= DUA4_PUZZLES || idx + 1 >= puzzles.length) finish();
    else {
      setIdx(idx + 1);
      puzzleStart.current = nowMs();
      room.send({ t: "prog", id: me.id, score: scoreRef.current, n: idx + 1 });
    }
  };

  const addNum = (slot: number) => {
    if (stage === "play" && !used.has(slot)) setTokens([...tokens, { text: String(nums[slot]), slot }]);
  };
  const addOp = (text: string) => {
    if (stage === "play") setTokens([...tokens, { text }]);
  };
  const back = () => setTokens(tokens.slice(0, -1));

  const submit = () => {
    if (stage !== "play") return;
    const bad = (msg: string) => {
      setNote(msg);
      setShake(true);
      setTimeout(() => setShake(false), 300);
    };
    if (used.size !== 4) return bad("Pakai keempat angka tepat satu kali.");
    const value = evalExpr(tokens.map((t) => t.text));
    if (value === null) return bad("Ekspresi tidak valid.");
    if (Math.abs(value - 24) > 1e-6) return bad(`Hasilnya ${Number.isInteger(value) ? value : value.toFixed(2)}, bukan 24.`);
    const sec = (nowMs() - puzzleStart.current) / 1000;
    const pts = 150 + Math.round(Math.max(0, 1 - sec / SPEED_WINDOW_S) * 100);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setSolved((n) => n + 1);
    setNote(`✅ Tepat 24! +${pts}`);
    advance();
  };

  const skip = () => {
    if (stage !== "play") return;
    setNote("Soal dilewati.");
    advance();
  };

  useEffect(() => {
    keyRef.current = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) {
        const slot = nums.findIndex((n, i) => String(n) === e.key && !used.has(i));
        if (slot >= 0) addNum(slot);
      } else if ("+-*/()".includes(e.key) && e.key.length === 1) addOp(e.key);
      else if (e.key === "Backspace") back();
      else if (e.key === "Enter") submit();
      else return;
      e.preventDefault();
    };
  });

  useEffect(() => {
    if (stage !== "play") return;
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  if (finalized) {
    return (
      <FinalPodium
        players={joined}
        scores={scores}
        meId={me.id}
        onBack={onLobby}
        backLabel="Kembali ke Lobi 🔁"
        onLeave={onLeave}
      />
    );
  }

  if (stage === "countdown") {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="text-6xl">{MP_MODES.dua4.emoji}</div>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Hitung 24</h3>
        <p className="mt-1 text-sm text-slate-500">Susun 4 angka jadi tepat 24. Pakai + − × ÷ dan kurung!</p>
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
          {solved}/{DUA4_PUZZLES} soal terjawab. Menunggu pemain lain…
        </p>
        <div className="mt-3 text-left">
          <Scoreboard players={joined} scores={scores} meId={me.id} />
        </div>
      </div>
    );
  }

  const btn = "rounded-xl border border-slate-200 bg-white py-3 text-lg font-black text-slate-700 shadow-sm transition active:scale-90 hover:bg-slate-50";

  return (
    <div className="max-w-md mx-auto select-none">
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="text-slate-500">
          Soal {idx + 1}/{DUA4_PUZZLES}
        </span>
        <span className="text-slate-900">
          Skor <span className="text-xl font-black text-indigo-600">{score}</span>
        </span>
        <span className={timeLeft < 20 ? "text-red-500 animate-pulse" : "text-slate-500"}>⏱ {Math.ceil(timeLeft)}s</span>
      </div>

      <div
        className={`rounded-2xl border-2 bg-white px-4 py-4 text-center transition-colors ${shake ? "border-red-400" : "border-slate-200"}`}
      >
        <p className="text-xs font-bold text-slate-400">Buat tepat 24 dengan keempat angka ini</p>
        <p className="mt-1 min-h-10 break-all font-mono text-3xl font-black tracking-wider text-slate-900">
          {tokens.length === 0
            ? "…"
            : tokens.map((t) => OPS.find((o) => o.text === t.text)?.label ?? t.text).join(" ")}
        </p>
      </div>
      <p className="mt-1.5 min-h-5 text-center text-xs font-bold text-slate-500">{note}</p>

      <div className="mt-1 grid grid-cols-4 gap-2">
        {nums.map((n, slot) => (
          <button
            key={slot}
            type="button"
            disabled={used.has(slot)}
            onClick={() => addNum(slot)}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 py-4 text-3xl font-black text-white shadow-md transition active:scale-90 disabled:opacity-25"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-6 gap-2">
        {OPS.map((o) => (
          <button key={o.text} type="button" onClick={() => addOp(o.text)} className={btn}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={back} disabled={tokens.length === 0} className={`${btn} text-sm disabled:opacity-40`}>
          ⌫ Hapus
        </button>
        <button type="button" onClick={skip} className={`${btn} text-sm`}>
          Lewati ⏭
        </button>
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow transition active:scale-95"
        >
          Cek ✔
        </button>
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400">Keyboard: angka, + − * / ( ), Backspace, Enter</p>

      <div className="mt-4">
        <Scoreboard players={joined} scores={scores} meId={me.id} />
      </div>
    </div>
  );
}
