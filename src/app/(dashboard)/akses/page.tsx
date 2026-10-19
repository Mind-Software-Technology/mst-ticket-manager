"use client";

// =====================================================
// Hak Akses Menu — khusus Co-Founder & Project/Sprint Lead
//
// Tentukan menu navbar apa saja yang boleh dibuka tiap anggota tim.
// Tanpa pengaturan = semua menu terbuka. Disimpan di public.menu_access
// (RLS: hanya role manager yang boleh menulis).
// =====================================================

import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ALL_MENU_KEYS, MENU_DEFS, MANAGER_ROLE, isMenuManager, type MenuKey } from "@/lib/menus";

interface Member {
  id: string;
  name: string;
  role: string;
}

const sameSet = (a: MenuKey[], b: MenuKey[]) => a.length === b.length && a.every((k) => b.includes(k));

export default function AksesPage() {
  const { session } = useSession();
  const me = session?.profile;
  const allowedToManage = !!me && isMenuManager(me);

  const [members, setMembers] = useState<Member[]>([]);
  /** Akses tersimpan; user tanpa entri = tanpa pembatasan. */
  const [saved, setSaved] = useState<Record<string, MenuKey[]>>({});
  /** Perubahan yang belum disimpan. */
  const [draft, setDraft] = useState<Record<string, MenuKey[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!allowedToManage) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [users, access] = await Promise.all([
        supabase.from("users").select("id, name, role").eq("is_active", true).order("name"),
        supabase.from("menu_access").select("user_id, menus"),
      ]);
      if (cancelled) return;
      if (users.error) {
        setError(users.error.message);
      } else if (access.error) {
        setError(`Tabel menu_access belum siap (${access.error.message}). Jalankan scripts/menu-access-feature.sql di Supabase.`);
      } else {
        setMembers((users.data ?? []) as Member[]);
        setSaved(
          Object.fromEntries(
            (access.data ?? []).map((r) => [
              r.user_id as string,
              (r.menus as string[]).filter((m) => (ALL_MENU_KEYS as string[]).includes(m)) as MenuKey[],
            ]),
          ),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [allowedToManage]);

  if (!me) return null;

  if (!allowedToManage) {
    return (
      <div className="p-8 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Khusus {MANAGER_ROLE}</h1>
        <p className="mt-1 text-sm text-slate-500">Kamu tidak punya izin untuk mengatur hak akses menu.</p>
      </div>
    );
  }

  const effective = (id: string): MenuKey[] => draft[id] ?? saved[id] ?? ALL_MENU_KEYS;
  const isDirty = (id: string) => id in draft && !sameSet(draft[id], saved[id] ?? ALL_MENU_KEYS);

  const setMenus = (id: string, menus: MenuKey[]) => {
    setNotice(null);
    setDraft((d) => ({ ...d, [id]: menus }));
  };

  const toggle = (id: string, key: MenuKey) => {
    const cur = effective(id);
    setMenus(id, cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]);
  };

  const save = async (m: Member) => {
    const menus = effective(m.id);
    setSavingId(m.id);
    setError(null);
    const supabase = createClient();
    // Semua menu tercentang = tanpa pembatasan -> hapus baris supaya menu baru di masa depan ikut terbuka.
    const res = sameSet(menus, ALL_MENU_KEYS)
      ? await supabase.from("menu_access").delete().eq("user_id", m.id)
      : await supabase
          .from("menu_access")
          .upsert({ user_id: m.id, menus, updated_by: me.id, updated_at: new Date().toISOString() });
    setSavingId(null);
    if (res.error) {
      setError(`Gagal menyimpan untuk ${m.name}: ${res.error.message}`);
      return;
    }
    setSaved((s) => {
      const next = { ...s };
      if (sameSet(menus, ALL_MENU_KEYS)) delete next[m.id];
      else next[m.id] = menus;
      return next;
    });
    setDraft((d) => {
      const next = { ...d };
      delete next[m.id];
      return next;
    });
    setNotice(`Akses ${m.name} tersimpan. Berlaku saat ${m.name} memuat ulang halaman.`);
  };

  const btn = "px-2 py-1 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hak Akses Menu</h1>
          <p className="text-sm text-slate-500">
            Centang menu yang boleh dibuka tiap anggota. Anggota yang belum diatur bisa membuka semua menu.
          </p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && (
        <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          <Check className="w-4 h-4" /> {notice}
        </p>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat…
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Anggota</th>
                {MENU_DEFS.map((d) => (
                  <th key={d.key} className="px-2 py-3 text-center font-semibold" title={d.desc}>
                    {d.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const manager = isMenuManager(m);
                const menus = effective(m.id);
                const dirty = isDirty(m.id);
                return (
                  <tr key={m.id} className={`border-t border-slate-100 ${dirty ? "bg-amber-50/50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {m.name}
                        {m.id === me.id && <span className="ml-1 text-[10px] font-semibold text-indigo-500">(kamu)</span>}
                      </p>
                      <p className="text-[11px] text-slate-400">{m.role}</p>
                    </td>
                    {MENU_DEFS.map((d) => (
                      <td key={d.key} className="px-2 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-indigo-600 disabled:opacity-40"
                          checked={manager || menus.includes(d.key)}
                          disabled={manager}
                          onChange={() => toggle(m.id, d.key)}
                          aria-label={`${m.name} — ${d.label}`}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      {manager ? (
                        <span className="block text-right text-[11px] font-semibold text-slate-400">Akses penuh</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" className={btn} onClick={() => setMenus(m.id, ALL_MENU_KEYS)}>
                            Semua
                          </button>
                          <button type="button" className={btn} onClick={() => setMenus(m.id, [])}>
                            Kosong
                          </button>
                          <button
                            type="button"
                            disabled={!dirty || savingId === m.id}
                            onClick={() => void save(m)}
                            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-40"
                          >
                            {savingId === m.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Simpan
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Catatan: ini mengatur menu &amp; halaman yang tampil di aplikasi. Menu Dashboard tetap butuh status admin, dan menu Profil serta
        Aplikasi selalu tersedia.
      </p>
    </div>
  );
}
