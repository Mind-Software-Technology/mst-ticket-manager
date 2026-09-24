"use client";

// =====================================================
// MentionToast — notifikasi @mention muncul sebagai kartu kecil
// di pojok konten (bukan lonceng), auto-hilang setelah dibuka/ditutup.
//
// Poll mention_notifications yang belum dibaca (read_at IS NULL) tiap
// beberapa detik. Klik kartu → buka tiket + tandai dibaca. Tombol X →
// tutup + tandai dibaca tanpa pindah halaman.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const POLL_INTERVAL_MS = 20_000;
const MAX_VISIBLE = 3;

interface MentionNotificationRow {
  id: string;
  ticket_id: string;
  excerpt: string | null;
  created_at: string;
  tickets: { subject: string | null; ticket_id: string | null } | null;
  mentioned_by_user: { name: string } | null;
}

interface Props {
  /** ID profil (public.users.id) user yang sedang login. */
  userId: string;
}

export function MentionToast({ userId }: Props) {
  const router = useRouter();
  const [toasts, setToasts] = useState<MentionNotificationRow[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  });

  const fetchUnread = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("mention_notifications")
      .select(
        "id, ticket_id, excerpt, created_at, tickets(subject, ticket_id), mentioned_by_user:users!mention_notifications_mentioned_by_fkey(name)",
      )
      .eq("mentioned_user_id", uid)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) return;
    const rows = data as unknown as MentionNotificationRow[];
    const fresh = rows.filter((n) => !seenIdsRef.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => seenIdsRef.current.add(n.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, MAX_VISIBLE));
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread, userId]);

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase
      .from("mention_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    void markRead(id);
  };

  const openTicket = (n: MentionNotificationRow) => {
    setToasts((prev) => prev.filter((t) => t.id !== n.id));
    void markRead(n.id);
    router.push(`/gawean/${n.ticket_id}`);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-[4.5rem] right-4 z-30 flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2 sm:right-6">
      {toasts.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-white p-3 shadow-lg"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
            <AtSign className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <button
            type="button"
            onClick={() => openTicket(n)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm text-slate-900">
              <span className="font-semibold">
                {n.mentioned_by_user?.name || "Seseorang"}
              </span>{" "}
              men-tag kamu di{" "}
              <span className="font-medium">
                {n.tickets?.ticket_id || n.tickets?.subject || "sebuah tiket"}
              </span>
            </p>
            {n.excerpt && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{n.excerpt}</p>
            )}
          </button>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            title="Tutup"
            className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
