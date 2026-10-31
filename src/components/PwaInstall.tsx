"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed";

export default function PwaInstall() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {}
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDeferred(null);
  };

  return (
    <div className="pwa-install-in fixed inset-x-4 bottom-4 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-4 text-white shadow-2xl shadow-blue-900/30 ring-1 ring-white/20">
        {/* dekorasi cahaya */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-indigo-300/20 blur-2xl" />

        <button
          onClick={dismiss}
          aria-label="Tutup"
          className="absolute right-2 top-2 rounded-full p-1.5 text-white/70 transition hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-center gap-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            className="h-12 w-12 shrink-0 rounded-xl shadow-lg ring-2 ring-white/40"
          />
          <div className="min-w-0 pr-5">
            <p className="text-sm font-semibold leading-tight">Install MST Task Manager</p>
            <p className="mt-0.5 text-xs leading-snug text-blue-100">
              Akses lebih cepat dari layar utama, tampil layaknya aplikasi.
            </p>
          </div>
        </div>

        <div className="relative mt-3.5 flex gap-2">
          <button
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
            className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-md transition hover:bg-blue-50 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            Install sekarang
          </button>
          <button
            onClick={dismiss}
            className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-white/10"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
