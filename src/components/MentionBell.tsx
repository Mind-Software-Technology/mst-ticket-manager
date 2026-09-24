"use client";

// =====================================================
// MentionBell — Lonceng notifikasi @mention di navbar
//
// Poll tabel mention_notifications tiap 30 detik, khusus milik
// user yang sedang login. "Sudah dibaca" dilacak server-side
// (kolom read_at) supaya konsisten lintas device.
// =====================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const POLL_INTERVAL_MS = 30_000;

interface MentionNotificationRow {
  id: string;
  ticket_id: string;
  excerpt: string | null;
  read_at: string | null;
  created_at: string;
  tickets: { subject: string | null; ticket_id: string | null } | null;
  mentioned_by_user: { name: string } | null;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

interface Props {
  /** ID profil (public.users.id) user yang sedang login. */
  userId: string;
}

export function MentionBell({ userId }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<MentionNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  });

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const uid = userIdRef.current;
    if (!uid) return;

    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from("mention_notifications")
        .select(
          "id, ticket_id, excerpt, read_at, created_at, tickets(subject, ticket_id), mentioned_by_user:users!mention_notifications_mentioned_by_fkey(name)",
        )
        .eq("mentioned_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("mention_notifications")
        .select("id", { count: "exact", head: true })
        .eq("mentioned_user_id", uid)
        .is("read_at", null),
    ]);

    if (error || !data) return;
    setNotifications(data as unknown as MentionNotificationRow[]);
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications, userId]);

  const handleOpenNotification = async (n: MentionNotificationRow) => {
    setOpen(false);
    router.push(`/gawean/${n.ticket_id}`);
    if (!n.read_at) {
      const supabase = createClient();
      await supabase
        .from("mention_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", n.id);
      setNotifications((prev) =>
        prev.map((row) => (row.id === n.id ? { ...row, read_at: new Date().toISOString() } : row)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    await supabase
      .from("mention_notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setNotifications((prev) =>
      prev.map((row) => (unreadIds.includes(row.id) ? { ...row, read_at: new Date().toISOString() } : row)),
    );
    setUnreadCount(0);
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifikasi mention"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Mention</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:underline font-medium"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  Belum ada yang men-tag kamu
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 ${
                      !n.read_at ? "bg-indigo-50/40" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AtSign className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 truncate">
                        <span className="font-medium">
                          {n.mentioned_by_user?.name || "Seseorang"}
                        </span>{" "}
                        men-tag kamu di{" "}
                        <span className="font-medium">
                          {n.tickets?.ticket_id || n.tickets?.subject || "sebuah tiket"}
                        </span>
                      </p>
                      {n.excerpt && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{n.excerpt}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.read_at && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
