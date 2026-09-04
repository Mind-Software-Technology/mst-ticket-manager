"use client";

// =====================================================
// Dashboard Layout — Supabase Auth + ERP-style top navbar
// =====================================================

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  CheckSquare,
  LayoutDashboard,
  Loader2,
  LogOut,
  Lightbulb,
  Settings,
  ChevronDown,
  UserCog,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/hooks/useSession";
import { PengajuanModalBell } from "@/components/PengajuanModalBell";
import { AppsMenu } from "@/components/AppsMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, profileStatus, profileError, authEmail, signOut } =
    useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Redirect ke login HANYA kalau benar-benar tidak ada auth session
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

  const navItems = [
    ...(profile.is_admin
      ? [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }]
      : []),
    { href: "/gawean", label: "Gawean", icon: CheckSquare },
    { href: "/checkin", label: "Check In", icon: CalendarCheck },
    { href: "/config", label: "Config", icon: Settings },
    { href: "/notes", label: "Catatan Ide", icon: Lightbulb },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {profileStatus === "linked_by_email" && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-900 text-xs px-3 py-1.5 rounded-full shadow">
          ⚠️ Profile belum di-link sempurna.{" "}
          <Link href="/debug" className="underline font-semibold">
            Debug
          </Link>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Brand + Nav */}
            <div className="flex items-center gap-6 min-w-0">
              <Link href="/gawean" className="flex-shrink-0">
                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  MST Workspace
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        if (item.href === "/gawean") {
                          try { sessionStorage.removeItem("gawean_v2"); } catch {}
                        }
                      }}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive(item.href)
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <AppsMenu />
              <PengajuanModalBell />

              {/* User menu */}
              <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-tight">
                    {profile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">
                    {profile.role}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">
                        {profile.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {session.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCog className="w-4 h-4 mr-2" />
                      Profil Saya
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Keluar
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.href === "/gawean") {
                      try { sessionStorage.removeItem("gawean_v2"); } catch {}
                    }
                  }}
                  className={`flex items-center whitespace-nowrap px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

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
              const supabase = createClient();
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
