// =====================================================
// Maintenance Page
//
// Halaman maintenance dengan desain premium.
// Ditampilkan saat MAINTENANCE_MODE=true via proxy.
// =====================================================

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance — MST Ticket Manager",
  description: "Website sedang dalam perbaikan. Silakan kembali beberapa saat lagi.",
  robots: "noindex, nofollow",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black relative overflow-hidden">
      {/* ── Decorative Blobs ─────────────────────────── */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob" />
      <div className="absolute top-[30%] right-[-15%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[30%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-4000" />

      {/* ── Main Card ────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-lg mx-4 p-8 md:p-12 bg-white/[0.07] backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/[0.12]">
        {/* Gear Icon with Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
              {/* Rotating gear */}
              <svg
                className="w-12 h-12 text-amber-400 animate-spin-slow"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-amber-400/30 animate-ping-slow" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white tracking-tight mb-3">
          Sedang Dalam Perbaikan
        </h1>

        {/* Subtitle */}
        <p className="text-center text-slate-300 text-base md:text-lg mb-8 leading-relaxed">
          Sistem <span className="font-semibold text-indigo-300">MST Ticket Manager</span> sedang
          dalam proses pembaruan untuk memberikan pengalaman yang lebih baik.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
        </div>

        {/* Info Cards */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xl mt-0.5">⏰</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Estimasi Waktu</p>
              <p className="text-xs text-slate-400">Proses pembaruan membutuhkan beberapa waktu. Silakan cek kembali nanti.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xl mt-0.5">🔔</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Notifikasi</p>
              <p className="text-xs text-slate-400">
                Kamu akan menerima notifikasi via Telegram Bot saat website kembali aktif.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xl mt-0.5">📱</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Butuh Bantuan?</p>
              <p className="text-xs text-slate-400">
                Hubungi admin melalui Telegram Bot MST untuk informasi lebih lanjut.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} MST — Mind Software Technology
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "200ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "400ms" }} />
          </div>
        </div>
      </div>

      {/* ── CSS Animations ───────────────────────────── */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 3s ease-in-out infinite;
        }

        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(20px, 40px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 12s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
