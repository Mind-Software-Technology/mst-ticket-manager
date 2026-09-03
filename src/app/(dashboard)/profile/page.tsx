"use client";

// =====================================================
// Profile Page — Ubah Password
//
// Menampilkan info profil (read-only) + form ubah password.
// Password lama diverifikasi dulu (re-auth) sebelum password
// baru disimpan via supabase.auth.updateUser.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/utils/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (sessionLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { profile } = session;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password baru tidak cocok");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Verifikasi password lama dulu (re-auth) supaya tidak sembarangan
      // orang yang kebetulan pegang sesi aktif bisa ganti password.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.email,
        password: currentPassword,
      });
      if (reauthError) {
        setError("Password lama salah");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Failed to change password:", err);
      const message = err instanceof Error ? err.message : "Gagal mengubah password";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => router.back()}
          className="mb-4"
        >
          Kembali
        </Button>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">Profil Saya</h1>
        <p className="text-slate-600 mb-6">Informasi akun dan pengaturan password</p>

        {/* Card: Info Profil (read-only) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Informasi Akun
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Nama</p>
              <p className="text-sm text-slate-900">{profile.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
              <p className="text-sm text-slate-900">{session.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Role</p>
              <p className="text-sm text-slate-900">{profile.role}</p>
            </div>
          </div>
        </div>

        {/* Card: Ubah Password */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
            <KeyRound className="w-4 h-4 text-slate-400" />
            Ubah Password
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Password Lama"
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Input
              label="Password Baru"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              helperText="Minimal 6 karakter"
              required
            />

            <Input
              label="Konfirmasi Password Baru"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {showPasswords ? (
                <span className="flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5" /> Sembunyikan password
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Tampilkan password
                </span>
              )}
            </label>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                Password berhasil diubah
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" loading={saving}>
                Simpan Password Baru
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
