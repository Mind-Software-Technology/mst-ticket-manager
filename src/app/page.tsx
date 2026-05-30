"use client";

// =====================================================
// Login Page — Email + Password (Supabase Auth)
// Sprint 1 / Foundation
//
// Menggantikan login PIN-based.
// Setelah login, redirect ke /admin (admin) atau /board.
// =====================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { LockKeyhole, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Kalau sudah login, langsung redirect (tidak boleh stay di login page).
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        await routeAfterLogin(session.user.id, session.user.email ?? null);
      } else {
        setCheckingSession(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Lookup profile public.users → tentukan target route.
   * Fallback by email kalau auth_user_id belum di-link.
   */
  async function routeAfterLogin(authUserId: string, email: string | null) {
    let isAdmin = false;
    let profileFound = false;

    const byAuthId = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (byAuthId.data) {
      isAdmin = Boolean(byAuthId.data.is_admin);
      profileFound = true;
    } else if (email) {
      const byEmail = await supabase
        .from("users")
        .select("is_admin")
        .ilike("email", email)
        .maybeSingle();
      if (byEmail.data) {
        isAdmin = Boolean(byEmail.data.is_admin);
        profileFound = true;
      }
    }

    if (!profileFound) {
      console.warn(
        "[LoginPage] profile not found; routing to dashboard so error UI can guide repair.",
      );
    }

    if (isAdmin) {
      router.push("/admin");
    } else {
      router.push("/board");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email atau password salah"
            : authError.message,
        );
        return;
      }

      if (!data.user) {
        setError("Login gagal: user tidak ditemukan");
        return;
      }

      await routeAfterLogin(data.user.id, data.user.email ?? null);
    } catch (err) {
      console.error("[LoginPage] unexpected error:", err);
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
      <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

      <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            MST Ticket Manager
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Sistem Work Tracking ERP-Style
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-200 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@mst.id"
                className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-200 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LockKeyhole className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Memproses...
              </>
            ) : (
              "Masuk ke Workspace"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Hubungi admin untuk reset password
        </p>
      </div>
    </div>
  );
}
