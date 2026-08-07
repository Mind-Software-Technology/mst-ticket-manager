"use client";

// =====================================================
// Configuration Page
// Sprint 3 / Config Management
//
// Unified page untuk manage Clients, Products, Projects, Sprints.
// Simplified implementation dengan tabs dan inline modals.
// =====================================================

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Send, Copy, Check, BellRing, Clock } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useProjects } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import { useLabels } from "@/hooks/useLabels";
import { useUsers } from "@/hooks/useUsers";
import { useCheckins } from "@/hooks/useCheckins";
import { useClientHealth } from "@/hooks/useClientHealth";
import { useSession } from "@/hooks/useSession";
import type { Client, Product, Project, Sprint, Label, User } from "@/types";

type Tab = "clients" | "products" | "projects" | "sprints" | "labels" | "users";

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>("clients");

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Configuration</h1>
          <p className="text-slate-600 mt-1">
            Manage master data for tickets: clients, products, projects,
            sprints, and labels
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 flex overflow-x-auto">
            {[
              { id: "clients", label: "Clients" },
              { id: "products", label: "Products" },
              { id: "projects", label: "Projects" },
              { id: "sprints", label: "Sprints" },
              { id: "labels", label: "Labels" },
              { id: "users", label: "Users & Telegram" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "clients" && <ClientsTab />}
            {activeTab === "products" && <ProductsTab />}
            {activeTab === "projects" && <ProjectsTab />}
            {activeTab === "sprints" && <SprintsTab />}
            {activeTab === "labels" && <LabelsTab />}
            {activeTab === "users" && <UsersTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== USERS & TELEGRAM TAB ====================

function UsersTab() {
  const { users, loading, updateUser } = useUsers();
  const { checkins: todaysCheckins } = useCheckins(true);
  const { session } = useSession();
  const isAdmin = Boolean(session?.profile.is_admin);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [waDraft, setWaDraft] = useState<Record<string, string>>({});
  const [savingWaId, setSavingWaId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const checkedInTodayIds = new Set(
    todaysCheckins.map((c) => c.employee_id).filter(Boolean) as string[],
  );

  const handleSaveWa = async (user: User) => {
    const value = (waDraft[user.id] ?? user.whatsapp_number ?? "").trim();
    setSavingWaId(user.id);
    try {
      await updateUser(user.id, { whatsapp_number: value || null } as Partial<User>);
      setWaDraft((d) => {
        const next = { ...d };
        delete next[user.id];
        return next;
      });
    } catch (err: any) {
      alert(`Gagal menyimpan nomor WA: ${err?.message || "Unknown error"}`);
    } finally {
      setSavingWaId(null);
    }
  };

  const handleRemind = async (user: User) => {
    setRemindingId(user.id);
    try {
      const res = await fetch("/api/checkin/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Gagal mengirim reminder: ${data?.error || "Unknown error"}`);
        return;
      }
      alert(data.message || "Reminder terkirim");
    } catch (err) {
      console.error("[config] remind error:", err);
      alert("Gagal mengirim reminder. Coba lagi.");
    } finally {
      setRemindingId(null);
    }
  };

  const handleCopyLink = async (user: User) => {
    try {
      // Minta kode acak sekali-pakai dari server (analysis #3b).
      const res = await fetch("/api/telegram/link-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Gagal membuat kode link: ${data?.error || "Unknown error"}`);
        return;
      }

      const message = `/start ${data.code}`;
      try {
        await navigator.clipboard.writeText(message);
        setCopiedId(user.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // Fallback kalau clipboard diblokir browser
        prompt(
          "Kirim pesan ini ke bot Telegram MST (berlaku 15 menit):",
          message,
        );
      }
    } catch (err) {
      console.error("[config] generate link code error:", err);
      alert("Gagal membuat kode link. Coba lagi.");
    }
  };

  const handleUnlink = async (user: User) => {
    if (!confirm(`Hapus koneksi Telegram untuk "${user.name}"?`)) return;
    try {
      await updateUser(user.id, { telegram_chat_id: null } as Partial<User>);
    } catch (err: any) {
      alert(`Gagal: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users & Telegram</h2>
          <p className="text-sm text-slate-500 mt-1">
            Hubungkan akun Telegram untuk menerima notifikasi sprint reminder
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Send className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Cara menghubungkan Telegram:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Klik tombol <strong>&quot;Copy Link Code&quot;</strong> di samping nama user</li>
              <li>Buka Telegram dan cari bot <strong>MST Ticket Manager</strong></li>
              <li>Kirim pesan yang sudah di-copy (contoh: <code className="bg-blue-100 px-1 rounded">/start LINK-abc12345</code>)</li>
              <li>Bot akan mengkonfirmasi koneksi berhasil ✅</li>
            </ol>
            <p className="mt-2 text-xs text-blue-600">
              ⏱️ Kode berlaku 15 menit dan hanya bisa dipakai sekali.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <p className="text-xs text-amber-600 mb-4">
          Hanya admin yang dapat menautkan / melepas Telegram user.
        </p>
      )}

      {/* WhatsApp reminder settings */}
      <ReminderHourSetting isAdmin={isAdmin} />

      {users.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          Belum ada user.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Division
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Telegram Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Nomor WhatsApp
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Check-In Hari Ini
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.division || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {user.telegram_chat_id ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Terhubung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        Belum terhubung
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={waDraft[user.id] ?? user.whatsapp_number ?? ""}
                          onChange={(e) =>
                            setWaDraft((d) => ({ ...d, [user.id]: e.target.value }))
                          }
                          placeholder="628xxxxxxxxxx"
                          className="w-36 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        {waDraft[user.id] !== undefined &&
                          waDraft[user.id] !== (user.whatsapp_number ?? "") && (
                            <button
                              onClick={() => handleSaveWa(user)}
                              disabled={savingWaId === user.id}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Simpan nomor WhatsApp"
                            >
                              {savingWaId === user.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">
                        {user.whatsapp_number || "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {checkedInTodayIds.has(user.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Sudah check-in
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        Belum check-in
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                      {user.telegram_chat_id ? (
                        <button
                          onClick={() => handleUnlink(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Putuskan koneksi Telegram"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Unlink
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCopyLink(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Copy link code untuk dikirim ke Telegram bot"
                        >
                          {copiedId === user.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-600" />
                              <span className="text-green-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Link Code
                            </>
                          )}
                        </button>
                      )}
                      {!checkedInTodayIds.has(user.id) && user.whatsapp_number && (
                        <button
                          onClick={() => handleRemind(user)}
                          disabled={remindingId === user.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Kirim reminder WA sekarang"
                        >
                          {remindingId === user.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <BellRing className="w-3.5 h-3.5" />
                          )}
                          Ingatkan
                        </button>
                      )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== REMINDER HOUR SETTING ====================

const REMINDER_HOUR_KEY = "checkin_reminder_hour";

function ReminderHourSetting({ isAdmin }: { isAdmin: boolean }) {
  const [hour, setHour] = useState<string>("10");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", REMINDER_HOUR_KEY)
        .maybeSingle();
      if (!cancelled && data?.value) setHour(data.value);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: REMINDER_HOUR_KEY, value: hour, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(`Gagal menyimpan jam reminder: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex gap-3 items-start flex-wrap">
        <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-800 flex-1 min-w-[240px]">
          <p className="font-medium mb-1">Jam Reminder WhatsApp Otomatis</p>
          <p className="text-amber-700 mb-3">
            Setiap hari jam segini, user yang belum check-in akan otomatis
            dikirimi WA reminder. Selain ini, admin tetap bisa kirim reminder
            tambahan kapan saja lewat tombol &quot;Ingatkan&quot; di tabel bawah.
          </p>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          ) : isAdmin ? (
            <div className="flex items-center gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="px-2.5 py-1.5 text-sm border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00 WIB
                  </option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="w-3.5 h-3.5" />
                ) : null}
                {saved ? "Tersimpan" : "Simpan"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-600">
              Reminder otomatis jam <strong>{hour}:00 WIB</strong>. Hanya
              admin yang bisa mengubah jam ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CLIENTS TAB ====================

function ClientsTab() {
  const { clients, loading, createClient, updateClient, deleteClient } =
    useClients();
  const { getHealth, loading: healthLoading } = useClientHealth();
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingClient(null);
    setFormData({ name: "", description: "" });
    setShowModal(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, description: client.description || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient({ ...formData, is_active: true });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`))
      return;

    try {
      await deleteClient(client.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Clients</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No clients yet. Add one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Health
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {client.description || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <ClientHealthBadge
                      health={getHealth(client.id)}
                      loading={healthLoading}
                    />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingClient ? "Edit Client" : "Add Client"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== CLIENT HEALTH BADGE ====================

function ClientHealthBadge({
  health,
  loading,
}: {
  health: import("@/hooks/useClientHealth").ClientHealth;
  loading: boolean;
}) {
  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  }

  const CONFIG: Record<
    string,
    { label: string; dot: string; bg: string; text: string }
  > = {
    green: { label: "Sehat", dot: "bg-green-500", bg: "bg-green-100", text: "text-green-700" },
    yellow: { label: "Perlu Perhatian", dot: "bg-amber-500", bg: "bg-amber-100", text: "text-amber-700" },
    red: { label: "Kritis", dot: "bg-red-500", bg: "bg-red-100", text: "text-red-700" },
    unknown: { label: "Belum Ada Tiket", dot: "bg-slate-400", bg: "bg-slate-100", text: "text-slate-500" },
  };

  const cfg = CONFIG[health.level];
  const detail =
    health.level === "unknown"
      ? undefined
      : `${health.overdueCount} tiket overdue dari ${health.openCount} tiket aktif${
          health.maxOverdueDays > 0 ? ` (terlama ${health.maxOverdueDays} hari)` : ""
        }`;

  return (
    <span
      title={detail}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ==================== PRODUCTS TAB ====================

function ProductsTab() {
  const { products, loading, createProduct, updateProduct, deleteProduct } =
    useProducts();
  const { clients } = useClients();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    prefix: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: "", prefix: "", client_id: "" });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      prefix: product.prefix,
      client_id: product.client_id || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.prefix.trim()) {
      alert("Name and Prefix are required");
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct({ ...formData, is_active: true, client_id: formData.client_id || null });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete product "${product.name}"?`)) return;

    try {
      await deleteProduct(product.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Products</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No products yet. Add one to enable ticket creation.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Prefix
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Client
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {product.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-indigo-600 font-semibold">
                      {product.prefix}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {product.client?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProduct ? "Edit Product" : "Add Product"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              label="Prefix (2-5 uppercase letters)"
              value={formData.prefix}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  prefix: e.target.value.toUpperCase(),
                })
              }
              required
              maxLength={5}
              placeholder="e.g., ZB, DOB, RZ"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client (Optional)
              </label>
              <select
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== PROJECTS TAB ====================

function ProjectsTab() {
  const { projects, loading, createProject, updateProject, deleteProject } =
    useProjects();
  const { clients } = useClients();
  const { products } = useProducts();
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    product_id: "",
    client_id: "",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingProject(null);
    setFormData({ name: "", product_id: "", client_id: "" });
    setShowModal(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      product_id: project.product_id || "",
      client_id: project.client_id || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject({
          ...formData,
          product_id: formData.product_id || null,
          client_id: formData.client_id || null,
          is_active: true,
        });
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}"?`)) return;

    try {
      await deleteProject(project.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No projects yet. Projects are optional for organizing tickets.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Product
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Client
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {project.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.product?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {project.client?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProject ? "Edit Project" : "Add Project"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Product (Optional)
              </label>
              <select
                value={formData.product_id}
                onChange={(e) =>
                  setFormData({ ...formData, product_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client (Optional)
              </label>
              <select
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== LABELS TAB ====================

function LabelsTab() {
  const { labels, loading, createLabel, updateLabel, deleteLabel } =
    useLabels();
  const [showModal, setShowModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingLabel(null);
    setFormData({ name: "", color: "#6366f1" });
    setShowModal(true);
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setFormData({ name: label.name, color: label.color || "#6366f1" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingLabel) {
        await updateLabel(editingLabel.id, formData);
      } else {
        await createLabel(formData);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (label: Label) => {
    if (!confirm(`Delete label "${label.name}"?`)) return;

    try {
      await deleteLabel(label.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Labels</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Label
        </Button>
      </div>

      {labels.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No labels yet. Add one to tag tickets (e.g., &quot;Carry Over&quot;).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Label
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Color
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label) => (
                <tr key={label.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${label.color}22`,
                        color: label.color,
                        border: `1px solid ${label.color}55`,
                      }}
                    >
                      {label.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                      <span
                        className="inline-block w-4 h-4 rounded border border-slate-200"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="font-mono text-xs">{label.color}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(label)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(label)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingLabel ? "Edit Label" : "Add Label"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Carry Over"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-10 w-14 rounded border border-slate-300 bg-white p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="font-mono"
                  maxLength={7}
                />
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: `${formData.color}22`,
                    color: formData.color,
                    border: `1px solid ${formData.color}55`,
                  }}
                >
                  {formData.name.trim() || "Preview"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== SPRINTS TAB ====================

function SprintsTab() {
  const { sprints, loading, createSprint, updateSprint, deleteSprint } =
    useSprints();
  const [showModal, setShowModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    status: "Aktif",
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    setEditingSprint(null);
    setFormData({ name: "", start_date: "", end_date: "", status: "Aktif" });
    setShowModal(true);
  };

  const handleEdit = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setFormData({
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      status: sprint.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (
      !formData.name.trim() ||
      !formData.start_date ||
      !formData.end_date
    ) {
      alert("Name, start date, and end date are required");
      return;
    }

    setSaving(true);
    try {
      if (editingSprint) {
        await updateSprint(editingSprint.id, formData);
      } else {
        await createSprint(formData);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(`Failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sprint: Sprint) => {
    if (!confirm(`Delete sprint "${sprint.name}"?`)) return;

    try {
      await deleteSprint(sprint.id);
    } catch (err: any) {
      alert(`Failed to delete: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Sprints</h2>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
          Add Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          No sprints yet. Sprints are optional for organizing work by time period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  End Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sprints.map((sprint) => (
                <tr key={sprint.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {sprint.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(sprint.start_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(sprint.end_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        sprint.status === "Aktif"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {sprint.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(sprint)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Pencil className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(sprint)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingSprint ? "Edit Sprint" : "Add Sprint"}
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Sprint 24"
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData({ ...formData, start_date: e.target.value })
              }
              required
            />
            <Input
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData({ ...formData, end_date: e.target.value })
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
