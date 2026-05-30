"use client";

// =====================================================
// /debug — Auth & Profile Diagnostic Page
//
// Halaman ini SENGAJA tidak diproteksi auth, supaya bisa
// dibuka untuk troubleshoot kalau session/profile kacau.
// Tampilkan state mentah dari Supabase Auth + public.users
// agar mudah cari root cause masalah login.
// =====================================================

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import type { Session, User as AuthUser } from "@supabase/supabase-js";

interface DiagnosticState {
  envSupabaseUrl: string | null;
  envSupabaseKey: string | null;
  hasSession: boolean;
  authUser: AuthUser | null;
  profileByAuthId: Record<string, unknown> | null;
  profileByAuthIdError: string | null;
  profileByEmail: Record<string, unknown> | null;
  profileByEmailError: string | null;
  allUsersSample: Record<string, unknown>[] | null;
  allUsersError: string | null;
}

const INITIAL: DiagnosticState = {
  envSupabaseUrl: null,
  envSupabaseKey: null,
  hasSession: false,
  authUser: null,
  profileByAuthId: null,
  profileByAuthIdError: null,
  profileByEmail: null,
  profileByEmailError: null,
  allUsersSample: null,
  allUsersError: null,
};

export default function DebugPage() {
  const [state, setState] = useState<DiagnosticState>(INITIAL);
  const [loading, setLoading] = useState(true);

  async function runDiagnostics() {
    setLoading(true);
    const next: DiagnosticState = { ...INITIAL };

    // 1. Env vars
    next.envSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      null;
    // Mask key (tampilkan hanya 8 karakter awal & akhir)
    next.envSupabaseKey = key
      ? `${key.slice(0, 8)}…${key.slice(-6)} (${key.length} chars)`
      : null;

    // 2. Auth session
    const sessionRes = await supabase.auth.getSession();
    const session: Session | null = sessionRes.data.session;
    next.hasSession = Boolean(session);
    next.authUser = session?.user ?? null;

    // 3. Profile by auth_user_id
    if (session?.user?.id) {
      const profileRes = await supabase
        .from("users")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      next.profileByAuthId = (profileRes.data as Record<string, unknown> | null) ?? null;
      next.profileByAuthIdError = profileRes.error?.message ?? null;
    }

    // 4. Profile by email (fallback)
    if (session?.user?.email) {
      const profileEmailRes = await supabase
        .from("users")
        .select("*")
        .ilike("email", session.user.email)
        .maybeSingle();
      next.profileByEmail = (profileEmailRes.data as Record<string, unknown> | null) ?? null;
      next.profileByEmailError = profileEmailRes.error?.message ?? null;
    }

    // 5. Sample data dari public.users (untuk lihat struktur)
    const sampleRes = await supabase
      .from("users")
      .select("id, name, email, role, division, is_admin, is_active, auth_user_id")
      .limit(10);
    next.allUsersSample = (sampleRes.data as Record<string, unknown>[] | null) ?? null;
    next.allUsersError = sampleRes.error?.message ?? null;

    setState(next);
    setLoading(false);
  }

  useEffect(() => {
    void runDiagnostics();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    void runDiagnostics();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🔍 Auth Debug</h1>
            <p className="text-sm text-slate-500 mt-1">
              Halaman diagnostik untuk troubleshoot login. Tidak diproteksi
              auth.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void runDiagnostics()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Force Sign Out
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Running diagnostics...</p>
        ) : (
          <div className="space-y-4">
            <Card title="1. Environment Variables" status={state.envSupabaseUrl ? "ok" : "fail"}>
              <Field label="NEXT_PUBLIC_SUPABASE_URL" value={state.envSupabaseUrl} />
              <Field
                label="NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
                value={state.envSupabaseKey}
              />
            </Card>

            <Card
              title="2. Supabase Auth Session"
              status={state.hasSession ? "ok" : "warn"}
            >
              <Field label="hasSession" value={state.hasSession} />
              {state.authUser ? (
                <>
                  <Field label="auth.user.id" value={state.authUser.id} />
                  <Field label="auth.user.email" value={state.authUser.email ?? "—"} />
                  <Field label="auth.user.role" value={state.authUser.role ?? "—"} />
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Belum login. Silakan login dulu di{" "}
                  <a href="/" className="text-indigo-600 underline">
                    /
                  </a>{" "}
                  lalu kembali ke sini.
                </p>
              )}
            </Card>

            {state.hasSession && (
              <>
                <Card
                  title="3. Profile by auth_user_id"
                  status={state.profileByAuthId ? "ok" : "fail"}
                >
                  {state.profileByAuthIdError && (
                    <p className="text-red-600 text-sm font-mono mb-2">
                      Error: {state.profileByAuthIdError}
                    </p>
                  )}
                  {state.profileByAuthId ? (
                    <Json data={state.profileByAuthId} />
                  ) : (
                    <p className="text-amber-700 text-sm">
                      ⚠️ Tidak ditemukan. Inilah penyebab blank screen.
                      Profile di <code>public.users</code> belum di-link ke
                      auth user. Jalankan{" "}
                      <code>04_repair_profile_linkage.sql</code> di Supabase.
                    </p>
                  )}
                </Card>

                <Card
                  title="4. Profile by email (fallback check)"
                  status={state.profileByEmail ? "ok" : "warn"}
                >
                  {state.profileByEmailError && (
                    <p className="text-red-600 text-sm font-mono mb-2">
                      Error: {state.profileByEmailError}
                    </p>
                  )}
                  {state.profileByEmail ? (
                    <>
                      <Json data={state.profileByEmail} />
                      <p className="text-amber-700 text-sm mt-2">
                        💡 Profile ditemukan via email tapi{" "}
                        <code>auth_user_id</code> belum nyambung. Jalankan{" "}
                        <code>04_repair_profile_linkage.sql</code> untuk fix
                        otomatis.
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-500 text-sm italic">
                      Tidak ada profile dengan email ini sama sekali.
                    </p>
                  )}
                </Card>
              </>
            )}

            <Card
              title="5. Sample public.users rows"
              status={state.allUsersSample?.length ? "ok" : "warn"}
            >
              {state.allUsersError && (
                <p className="text-red-600 text-sm font-mono mb-2">
                  Error: {state.allUsersError}
                </p>
              )}
              {state.allUsersSample?.length ? (
                <Json data={state.allUsersSample} />
              ) : (
                <p className="text-amber-700 text-sm">
                  ⚠️ Tabel <code>public.users</code> kosong atau RLS memblokir.
                  Jalankan migration <code>02_seed_auth_users.sql</code>.
                </p>
              )}
            </Card>

            <Card title="📋 Yang Harus Saya Salin Untuk Asisten" status="info">
              <p className="text-sm text-slate-600 mb-2">
                Klik tombol di bawah untuk salin diagnostik lengkap (sebagai
                JSON), lalu paste ke chat:
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    JSON.stringify(state, null, 2),
                  );
                  alert("Diagnostik disalin ke clipboard");
                }}
                className="px-3 py-1.5 bg-slate-700 text-white rounded text-sm font-medium hover:bg-slate-800"
              >
                📋 Copy as JSON
              </button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tiny presentational helpers ────────────────────

type Status = "ok" | "warn" | "fail" | "info";

function Card({
  title,
  status,
  children,
}: {
  title: string;
  status: Status;
  children: React.ReactNode;
}) {
  const ring =
    status === "ok"
      ? "border-green-200 bg-green-50"
      : status === "warn"
        ? "border-amber-200 bg-amber-50"
        : status === "fail"
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white";
  const dot =
    status === "ok"
      ? "bg-green-500"
      : status === "warn"
        ? "bg-amber-500"
        : status === "fail"
          ? "bg-red-500"
          : "bg-slate-400";
  return (
    <section className={`rounded-xl border ${ring} p-4`}>
      <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="text-sm font-mono flex flex-wrap gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-900 break-all">
        {value === null || value === undefined ? (
          <em className="text-slate-400">null</em>
        ) : typeof value === "boolean" ? (
          value ? (
            <span className="text-green-700">true</span>
          ) : (
            <span className="text-red-700">false</span>
          )
        ) : (
          String(value)
        )}
      </span>
    </div>
  );
}

function Json({ data }: { data: unknown }) {
  return (
    <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
