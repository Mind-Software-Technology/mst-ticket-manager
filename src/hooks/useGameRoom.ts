"use client";

// =====================================================
// useGameRoom — ruangan multiplayer di atas Supabase Realtime
//
// Presence = daftar pemain di ruangan, Broadcast = pesan permainan.
// Tidak butuh tabel. send() juga dikirim balik ke pendengar lokal
// (loopback) supaya host dan pemain lain memakai jalur kode yang sama.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { MpMessage, MpPlayer } from "@/lib/multiplayer";

interface PresenceMeta {
  id: string;
  name: string;
  joinedAt: number;
}

export type RoomStatus = "connecting" | "ready" | "error";
type Listener = (msg: MpMessage) => void;

export function useGameRoom(code: string, me: MpPlayer) {
  const [players, setPlayers] = useState<Array<MpPlayer & { joinedAt: number }>>([]);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const listeners = useRef<Set<Listener>>(new Set());

  const { id: meId, name: meName } = me;

  useEffect(() => {
    // Klien khusus ruangan (bukan singleton aplikasi): tiap mount/remount (mis. React
    // Strict Mode) dapat channel yang bersih, tidak bentrok dengan channel lama yang
    // masih sedang ditutup. Broadcast + Presence tidak butuh sesi auth.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const joinedAt = Date.now();
    const channel = supabase.channel(`mst-game-${code}`, {
      config: { broadcast: { self: false }, presence: { key: meId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const list = Object.values(state)
          .map((metas) => metas[0])
          .filter(Boolean)
          .map((m) => ({ id: m.id, name: m.name, joinedAt: m.joinedAt }))
          .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
        setPlayers(list);
      })
      .on("broadcast", { event: "msg" }, ({ payload }) => {
        listeners.current.forEach((fn) => fn(payload as MpMessage));
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          await channel.track({ id: meId, name: meName, joinedAt } satisfies PresenceMeta);
          setStatus("ready");
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => {
      channelRef.current = null;
      void supabase.removeAllChannels().then(() => supabase.realtime.disconnect());
    };
  }, [code, meId, meName]);

  const send = useCallback((msg: MpMessage) => {
    void channelRef.current?.send({ type: "broadcast", event: "msg", payload: msg });
    setTimeout(() => listeners.current.forEach((fn) => fn(msg)), 0);
  }, []);

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { players, status, send, subscribe };
}
