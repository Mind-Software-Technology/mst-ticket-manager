"use client";

// =====================================================
// MultiplayerHub — buat/gabung ruangan, lobi, lalu main bareng
// =====================================================

import { useEffect, useState } from "react";
import { Copy, Loader2, LogOut } from "lucide-react";
import { useGameRoom } from "@/hooks/useGameRoom";
import type { GameTicket } from "@/lib/minigame";
import {
  MP_MODES,
  MP_MODE_KEYS,
  avatarFor,
  buildMpQuestions,
  buildRaceQueue,
  buildWhackSchedule,
  canPlayMp,
  canPlayRace,
  canPlayWhack,
  normalizeCode,
  randomRoomCode,
  type MpMode,
  type MpPlayer,
  type StartPayload,
} from "@/lib/multiplayer";
import { QuizBattle } from "./QuizBattle";
import { TypeRace } from "./TypeRace";
import { WhackRace } from "./WhackRace";

const TEAM_ROOM = "TIM";

export function MultiplayerHub({
  me,
  tickets,
  names,
}: {
  me?: MpPlayer;
  tickets: GameTicket[];
  names: string[];
}) {
  const [code, setCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");

  if (!me) return <p className="py-10 text-center text-sm text-slate-500">Masuk dulu untuk main bareng.</p>;

  if (code) {
    return <Room key={code} code={code} me={me} tickets={tickets} names={names} onLeave={() => setCode(null)} />;
  }

  const btn =
    "px-6 py-3 rounded-xl text-white font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-lg hover:opacity-90 active:scale-95 transition disabled:opacity-40";

  return (
    <div className="max-w-md mx-auto text-center py-6">
      <div className="text-6xl animate-lb-float inline-block">👥</div>
      <h3 className="mt-3 text-2xl font-black text-slate-900">Main Bareng Tim</h3>
      <p className="mt-1 text-sm text-slate-500">
        Buat ruangan, bagikan kodenya, dan adu cepat dengan rekan setim secara langsung.
      </p>

      <div className="mt-5 flex flex-col items-stretch gap-2">
        <button type="button" className={btn} onClick={() => setCode(randomRoomCode())}>
          Buat Ruangan Baru 🚀
        </button>
        <button
          type="button"
          className="px-6 py-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
          onClick={() => setCode(TEAM_ROOM)}
        >
          Masuk Ruang Tim (kode {TEAM_ROOM}) 🏢
        </button>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const c = normalizeCode(joinInput);
          if (c.length >= 3) setCode(c);
        }}
      >
        <input
          value={joinInput}
          onChange={(e) => setJoinInput(normalizeCode(e.target.value))}
          placeholder="Kode ruangan"
          className="flex-1 px-4 py-3 text-center text-lg font-mono font-black tracking-widest border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
          autoComplete="off"
        />
        <button type="submit" disabled={joinInput.length < 3} className="px-5 py-3 rounded-xl font-black text-white bg-slate-900 disabled:opacity-40">
          Gabung
        </button>
      </form>
    </div>
  );
}

// ─── Ruangan ─────────────────────────────────────────

function Room({
  code,
  me,
  tickets,
  names,
  onLeave,
}: {
  code: string;
  me: MpPlayer;
  tickets: GameTicket[];
  names: string[];
  onLeave: () => void;
}) {
  const room = useGameRoom(code, me);
  const { subscribe } = room;
  const [config, setConfig] = useState<StartPayload | null>(null);
  const [mode, setMode] = useState<MpMode>("quiz");
  const [copied, setCopied] = useState(false);

  // Pesan start / kembali ke lobi berlaku selama kita berada di ruangan.
  useEffect(
    () =>
      subscribe((m) => {
        if (m.t === "start") setConfig(m);
        else if (m.t === "lobby") setConfig(null);
      }),
    [subscribe],
  );

  const players: MpPlayer[] = room.players.map(({ id, name }) => ({ id, name }));
  const isHost = room.players[0]?.id === me.id;
  const hostName = room.players[0]?.name;

  if (config) {
    const props = {
      room: { players, send: room.send, subscribe: room.subscribe },
      me,
      config,
      onLobby: () => room.send({ t: "lobby" }),
      onLeave,
    };
    // key: ronde baru = komponen baru (state permainan bersih).
    const key = config.questions?.length
      ? config.questions.map((q) => q.prompt).join("|")
      : (config.queue?.[0]?.ticket_id ?? String(config.schedule?.[0]?.at)) + (config.schedule?.length ?? "");
    if (config.mode === "race") return <TypeRace key={key} {...props} />;
    if (config.mode === "whack") return <WhackRace key={key} {...props} />;
    return <QuizBattle key={key} {...props} />;
  }

  const cfg = MP_MODES[mode];
  const playable =
    mode === "race" ? canPlayRace(tickets) : mode === "whack" ? canPlayWhack(tickets) : canPlayMp(tickets, names);
  const enough = players.length >= cfg.minPlayers;

  const start = () => {
    const base = { hostId: me.id, players, mode } as const;
    const payload: StartPayload =
      mode === "race"
        ? { ...base, queue: buildRaceQueue(tickets) }
        : mode === "whack"
          ? { ...base, schedule: buildWhackSchedule(tickets) }
          : { ...base, questions: buildMpQuestions(tickets, names) };
    room.send({ t: "start", ...payload });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  return (
    <div className="max-w-lg mx-auto py-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kode ruangan</p>
          <button
            type="button"
            onClick={copy}
            title="Salin kode"
            className="flex items-center gap-2 text-3xl font-black tracking-[0.3em] text-slate-900 hover:text-indigo-600"
          >
            {code}
            <Copy className="w-4 h-4 text-slate-400" />
            {copied && <span className="text-xs font-semibold tracking-normal text-emerald-600">tersalin</span>}
          </button>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </div>

      {room.status === "connecting" && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Menyambung ke ruangan…
        </p>
      )}
      {room.status === "error" && (
        <p className="mt-6 text-center text-sm text-red-600">Gagal tersambung ke server realtime. Coba keluar lalu masuk lagi.</p>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-bold text-slate-500">Pemain di ruangan ({players.length})</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              <span>{avatarFor(p.id)}</span>
              {p.name}
              {i === 0 && <span title="Host">👑</span>}
            </li>
          ))}
        </ul>
        {players.length < 2 && room.status === "ready" && (
          <p className="mt-2 text-xs text-slate-400">Bagikan kode <b>{code}</b> ke rekan setim supaya mereka bisa gabung.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MP_MODE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={!isHost}
            onClick={() => setMode(key)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              mode === key ? "border-indigo-600 bg-indigo-600 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } disabled:cursor-default`}
          >
            <span className="text-2xl">{MP_MODES[key].emoji}</span>
            <span className="block text-sm font-bold">{MP_MODES[key].label}</span>
          </button>
        ))}
      </div>
      {!isHost && <p className="mt-1 text-center text-[11px] text-slate-400">Hanya host ({hostName}) yang memilih mode &amp; memulai.</p>}

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-left">
        <p className="text-sm text-slate-500">{cfg.tagline}</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {cfg.rules.map((r) => (
            <li key={r} className="flex gap-2">
              <span>▸</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={start}
          disabled={!isHost || !enough || !playable || room.status !== "ready"}
          className="px-8 py-3 rounded-xl text-white font-black bg-gradient-to-r from-fuchsia-500 to-indigo-500 shadow-lg hover:opacity-90 active:scale-95 transition disabled:opacity-40"
        >
          Mulai Bareng! 🚀
        </button>
        {isHost && !enough && <p className="mt-2 text-xs text-slate-500">Butuh minimal {cfg.minPlayers} pemain.</p>}
        {isHost && !playable && <p className="mt-2 text-xs text-slate-500">Tiket belum cukup untuk mode ini.</p>}
      </div>
    </div>
  );
}
