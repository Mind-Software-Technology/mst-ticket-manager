// =====================================================
// PengajuanModalBell — Lonceng notif pengajuan modal
//
// Poll tabel pengajuan_modal_notifications tiap 30 detik.
// "Sudah dibaca" dilacak per-browser via localStorage
// (notif ini global untuk semua user, bukan per-akun).
// =====================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Wallet } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const LAST_SEEN_KEY = "pengajuan_modal_last_seen";
const POLL_INTERVAL_MS = 30_000;
const PENGAJUAN_MODAL_URL = "https://mst-pengajuan-modal.vercel.app/";

interface NotificationRow {
  id: string;
  expense_id: string;
  title: string;
  amount: number | null;
  submitter_name: string | null;
  category: string | null;
  created_at: string;
}

function formatRupiah(amount: number | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
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

export function PengajuanModalBell() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const lastSeenRef = useRef<string>("");

  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pengajuan_modal_notifications")
      .select("id, expense_id, title, amount, submitter_name, category, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) return;

    setNotifications(data);

    const lastSeen = lastSeenRef.current;
    const unread = lastSeen
      ? data.filter((n) => n.created_at > lastSeen).length
      : data.length;
    setUnreadCount(unread);
  }, []);

  useEffect(() => {
    try {
      lastSeenRef.current = localStorage.getItem(LAST_SEEN_KEY) || "";
    } catch {
      lastSeenRef.current = "";
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleToggle = () => {
    setOpen((v) => !v);
    if (!open && notifications.length > 0) {
      const latest = notifications[0].created_at;
      lastSeenRef.current = latest;
      try {
        localStorage.setItem(LAST_SEEN_KEY, latest);
      } catch {}
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifikasi pengajuan modal"
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
              <p className="text-sm font-semibold text-slate-900">
                Pengajuan Modal
              </p>
              <a
                href={PENGAJUAN_MODAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Buka web →
              </a>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  Belum ada pengajuan modal
                </div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={PENGAJUAN_MODAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {[n.submitter_name, formatRupiah(n.amount)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
