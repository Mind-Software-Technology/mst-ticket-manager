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

export function MinigameHub({ userId }: { userId?: string }) {
  const { tickets, names, loading, error } = useMinigameTickets();
  const [game, setGame] = useState<GameKey>("quiz");

  return (
    <div className="pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {GAME_KEYS.map((key) => (
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

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-5 min-h-[22rem]">
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {loading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan tiket untuk bermain…
          </div>
        ) : (
          <>
            {game === "quiz" && <QuizGame key="quiz" tickets={tickets} names={names} userId={userId} />}
            {game === "deadline" && <DeadlineGame key="deadline" tickets={tickets} userId={userId} />}
            {game === "whack" && <WhackGame key="whack" tickets={tickets} userId={userId} />}
          </>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Soal dibuat dari tiket asli tim. Rekor hanya tersimpan di browser kamu.
      </p>
    </div>
  );
}
