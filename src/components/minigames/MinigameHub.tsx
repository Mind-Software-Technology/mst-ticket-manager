"use client";

// =====================================================
// MinigameHub — pilihan minigame berbasis tiket di halaman Peringkat
// =====================================================

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMinigameTickets } from "@/hooks/useMinigameTickets";
import { GAMES, GAME_KEYS, type GameKey } from "@/lib/minigame";
import { QuizGame } from "./QuizGame";
import { DeadlineGame } from "./DeadlineGame";
import { WhackGame } from "./WhackGame";
import { PrioritySortGame } from "./PrioritySortGame";
import { CategoryGuessGame } from "./CategoryGuessGame";
import { SpeedTypeGame } from "./SpeedTypeGame";
import { MultiplayerHub } from "./MultiplayerHub";
import { ContentQuizGame } from "./ContentQuizGame";
import { MemoryGame } from "./MemoryGame";
import { ReflexGame } from "./ReflexGame";
import { RunGame } from "./RunGame";
import { SimonGame } from "./SimonGame";
import { StroopGame } from "./StroopGame";
import { NumberGame } from "./NumberGame";
import { BedaGame } from "./BedaGame";
import { BesarGame } from "./BesarGame";
import { Game2048 } from "./Game2048";
import { SnakeGame } from "./SnakeGame";
import { Dua4Game } from "./Dua4Game";
import { SandiGame } from "./SandiGame";
import { MinesGame } from "./MinesGame";

const GROUP_LABEL = { tiket: "🎫 Seputar Tiket", umum: "🎉 Seru-seruan Umum" } as const;

export function MinigameHub({ userId, userName }: { userId?: string; userName?: string }) {
  const { tickets, names, loading, error } = useMinigameTickets();
  const [game, setGame] = useState<GameKey>("quiz");
  const [multi, setMulti] = useState(false);

  return (
    <div className="pt-4">
      <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-bold">
        {[
          { v: false, label: "🎮 Solo" },
          { v: true, label: "👥 Main Bareng" },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setMulti(t.v)}
            className={`px-4 py-1.5 rounded-lg transition ${multi === t.v ? "bg-white text-indigo-700 shadow" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!multi && (
        <div className="space-y-3">
          {(["tiket", "umum"] as const).map((g) => (
            <div key={g}>
              <p className="mb-1.5 text-xs font-bold text-slate-500">{GROUP_LABEL[g]}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {GAME_KEYS.filter((k) => GAMES[k].group === g).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGame(key)}
                    className={`text-left px-4 py-3 rounded-xl border transition-all ${
                      game === key
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-2xl">{GAMES[key].emoji}</span>
                    <span className="block text-sm font-bold mt-0.5">{GAMES[key].label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-5 min-h-[22rem]">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan tiket untuk bermain…
          </div>
        ) : (
          multi ? (
            <MultiplayerHub
              me={userId && userName ? { id: userId, name: userName } : undefined}
              tickets={tickets}
              names={names}
            />
          ) : (
          <>
            {game === "quiz" && <QuizGame key="quiz" tickets={tickets} names={names} userId={userId} />}
            {game === "deadline" && <DeadlineGame key="deadline" tickets={tickets} userId={userId} />}
            {game === "whack" && <WhackGame key="whack" tickets={tickets} userId={userId} />}
            {game === "priority_sort" && <PrioritySortGame key="priority_sort" tickets={tickets} userId={userId} />}
            {game === "category_guess" && <CategoryGuessGame key="category_guess" tickets={tickets} userId={userId} />}
            {game === "speed_type" && <SpeedTypeGame key="speed_type" tickets={tickets} userId={userId} />}
            {(game === "hitung" || game === "trivia" || game === "kata") && (
              <ContentQuizGame key={game} game={game} userId={userId} />
            )}
            {game === "memory" && <MemoryGame key="memory" userId={userId} />}
            {game === "reflex" && <ReflexGame key="reflex" userId={userId} />}
            {game === "lari" && <RunGame key="lari" userId={userId} />}
            {game === "simon" && <SimonGame key="simon" userId={userId} />}
            {game === "warna" && <StroopGame key="warna" userId={userId} />}
            {game === "angka" && <NumberGame key="angka" userId={userId} />}
            {game === "beda" && <BedaGame key="beda" userId={userId} />}
            {game === "besar" && <BesarGame key="besar" userId={userId} />}
            {game === "g2048" && <Game2048 key="g2048" userId={userId} />}
            {game === "ular" && <SnakeGame key="ular" userId={userId} />}
            {game === "dua4" && <Dua4Game key="dua4" userId={userId} />}
            {game === "sandi" && <SandiGame key="sandi" userId={userId} />}
            {game === "ranjau" && <MinesGame key="ranjau" userId={userId} />}
          </>
          )
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Soal dibuat dari tiket asli tim. Rekor solo hanya tersimpan di browser kamu; main bareng berjalan langsung lewat ruangan.
      </p>
    </div>
  );
}
