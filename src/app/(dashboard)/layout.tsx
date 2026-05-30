"use client";

// =====================================================
// Dashboard Layout — Supabase Auth + role-based nav
// Sprint 1 / Foundation
// =====================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  LayoutDashboard,
  Loader2,
  LogOut,
} from "lucide-react";
import { supabase } from "@/utils/supabase";
import { useSession } from "@/hooks/useSession";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, loading, profileStatus, profileError, authEmail, signOut } =
    useSession();

  // Redirect ke login HANYA kalau benar-benar tidak ada auth session
  // (bukan karena profile gak ketemu — biar error UI yg handle).
  useEffect(() => {
    if (loading) return;
    if (session === null && profileStatus === null) {
      router.replace("/");
    }
  }, [loading, session, profileStatus, router]);

  // 1. Loading initial session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // 2. Tidak ada auth session — useEffect lagi redirect ke /
  if (session === null && profileStatus === null) {
    return null;
  }

  // 3. Ada auth session tapi profile tidak ditemukan / error
  if (session === null && profileStatus !== null) {
    return (
      <ProfileErrorScreen
        status={profileStatus}
        error={profileError}
        email={authEmail}
        onSignOut={async () => {
          await signOut();
          router.replace("/");
        }}
      />
    );
  }

  // 4. Session OK
  if (!session) return null; // type guard
  const { profile } = session;

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {profileStatus === "linked_by_email" && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 rounded-full shadow">
          ⚠️ Profile belum di-link sempurna.{" "}
          <Link href="/debug" className="underline font-semibold">
            Debug
          </Link>
        </div>
      )}

      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r md:border-b-0 border-slate-200 flex flex-col shadow-sm flex-shrink-0">
        <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center md:block">
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              MST Workspace
            </h2>
            <p className="text-xs text-slate-500 mt-1 hidden md:block">
              Ticket & Work Tracking
            </p>
          </div>
          <div className="md:hidden flex items-center space-x-3">
            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">
              {profile.name}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-red-500 p-2"
              aria-label="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-0">
          <div className="hidden md:block mb-4 px-2 py-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider mb-1">
              Logged in as
            </p>
            <p className="font-medium text-slate-900">{profile.name}</p>
            <p className="text-xs text-slate-600 truncate">{profile.role}</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {session.email}
            </p>
          </div>

          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 w-full">
            {profile.is_admin && (
              <Link
                href="/admin"
                className="whitespace-nowrap flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 mr-2 md:mr-3 text-slate-400" />
                Admin Dashboard
              </Link>
            )}
            <Link
              href="/board"
              className="whitespace-nowrap flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <CheckSquare className="w-5 h-5 mr-2 md:mr-3 text-slate-400" />
              Tugas Saya
            </Link>
          </nav>
        </div>

        <div className="hidden md:block p-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// ─── Error UI saat profile tidak ditemukan ───────────

interface ProfileErrorScreenProps {
  status: NonNullable<ReturnType<typeof useSession>["profileStatus"]>;
  error: string | null;
  email: string | null;
  onSignOut: () => Promise<void>;
}

function ProfileErrorScreen({
  status,
  error,
  email,
  onSignOut,
}: ProfileErrorScreenProps) {
  const titles: Record<typeof status, string> = {
    ok: "OK",
    linked_by_email: "Profile Belum Sinkron",
    not_found: "Profile Tidak Ditemukan",
    error: "Gagal Memuat Profile",
  };

  const descriptions: Record<typeof status, string> = {
    ok: "",
    linked_by_email:
      "Login berhasil dan email kamu cocok dengan data tim, tapi belum di-link ke akun auth. Jalankan migration 04_repair_profile_linkage.sql untuk fix otomatis.",
    not_found:
      "Login berhasil, tapi tidak ada profile di tabel public.users untuk email ini. Pastikan migration 02_seed_auth_users.sql sudah dijalankan.",
    error:
      "Terjadi error saat query profile. Cek koneksi Supabase, RLS policy, dan environment variable.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg border border-amber-200 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {titles[status]}
            </h1>
            <p className="text-xs text-slate-500 font-mono">status: {status}</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-4">{descriptions[status]}</p>

        {email && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-sm">
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
              Email login
            </p>
            <p className="font-mono text-slate-900">{email}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            <p className="text-red-700 text-xs uppercase tracking-wide mb-1">
              Error message
            </p>
            <p className="font-mono text-red-900 break-all">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6">
          <Link
            href="/debug"
            className="block text-center px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Buka Halaman Debug →
          </Link>
          <button
            type="button"
            onClick={() => {
              void onSignOut();
            }}
            className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            Sign Out & Coba Lagi
          </button>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="text-xs text-slate-500 hover:text-slate-700 mt-1"
          >
            Force Reload
          </button>
        </div>
      </div>
    </div>
  );
}
