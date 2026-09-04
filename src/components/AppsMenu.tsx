// =====================================================
// AppsMenu — Menu "Aplikasi" di navbar
//
// Daftar link aplikasi eksternal yang ditautkan ke workspace
// (mis. Pengajuan Modal), disimpan di tabel public.linked_apps.
// Semua user bisa lihat & tambah link baru; hapus dibatasi admin.
// =====================================================

"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, ExternalLink, Plus, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/hooks/useSession";

interface LinkedApp {
  id: string;
  name: string;
  url: string;
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function AppsMenu() {
  const { session } = useSession();
  const isAdmin = Boolean(session?.profile.is_admin);

  const [apps, setApps] = useState<LinkedApp[]>([]);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("linked_apps")
      .select("id, name, url")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data) setApps(data);
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleAdd = async () => {
    setFormError(null);
    const cleanName = name.trim();
    const cleanUrl = normalizeUrl(url);

    if (!cleanName || !cleanUrl) {
      setFormError("Nama & link wajib diisi.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("linked_apps")
      .insert({ name: cleanName, url: cleanUrl });
    setSaving(false);

    if (error) {
      setFormError(
        error.code === "23505" ? "Link ini sudah ada." : "Gagal menyimpan link."
      );
      return;
    }

    setName("");
    setUrl("");
    setShowForm(false);
    fetchApps();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from("linked_apps").delete().eq("id", id);
    fetchApps();
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Menu aplikasi"
      >
        <LayoutGrid className="w-5 h-5 text-slate-600" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setOpen(false);
              setShowForm(false);
              setFormError(null);
            }}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Aplikasi</p>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {apps.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400">
                  Belum ada aplikasi tertaut
                </div>
              ) : (
                apps.map((app) => (
                  <div
                    key={app.id}
                    className="group flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 flex-1 min-w-0 px-4 py-2.5 text-sm text-slate-700"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{app.name}</span>
                    </a>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(app.id)}
                        className="mr-2 p-1 rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
                        aria-label={`Hapus ${app.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100">
              {showForm ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Nama aplikasi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formError && (
                    <p className="text-xs text-red-600">{formError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setFormError(null);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Aplikasi
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
