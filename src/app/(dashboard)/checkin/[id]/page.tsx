"use client";

// =====================================================
// Check-In Detail Page
//
// Lihat detail check-in, tambah fokus harian ke check-in yang
// SAMA (tidak perlu bikin check-in baru), dan hapus check-in.
// Tambah & hapus hanya untuk pemilik check-in atau admin.
// =====================================================

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { Button, Input, Modal, Badge, EmptyState } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { useCheckinDetail } from "@/hooks/useCheckinDetail";
import { useTickets } from "@/hooks/useTickets";
import type { Ticket } from "@/types";

interface DraftItem {
  key: string;
  ticket: Ticket | null;
  description: string;
}

export default function CheckinDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checkinId = params?.id as string;

  const { session } = useSession();
  const { checkin, loading, error, addItems, deleteCheckin } =
    useCheckinDetail(checkinId);

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canManage =
    !!checkin &&
    (checkin.employee_id === session?.profile?.id ||
      !!session?.profile?.is_admin);

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // ─── Draft handlers ────────────────────────────────
  const addTicketDraft = (ticket: Ticket) => {
    const already =
      drafts.some((d) => d.ticket?.id === ticket.id) ||
      checkin?.items?.some((it) => it.ticket_id === ticket.id);
    if (already) {
      setShowPicker(false);
      return;
    }
    setDrafts((prev) => [
      ...prev,
      { key: `${ticket.id}-${Date.now()}`, ticket, description: "" },
    ]);
    setShowPicker(false);
  };

  const addTextDraft = () =>
    setDrafts((prev) => [
      ...prev,
      { key: `text-${Date.now()}`, ticket: null, description: "" },
    ]);

  const updateDraft = (key: string, value: string) =>
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, description: value } : d)),
    );

  const removeDraft = (key: string) =>
    setDrafts((prev) => prev.filter((d) => d.key !== key));

  const handleSaveDrafts = async () => {
    const invalid = drafts.find((d) => !d.ticket && !d.description.trim());
    if (invalid) {
      alert("Catatan bebas tidak boleh kosong.");
      return;
    }
    setSaving(true);
    try {
      await addItems(
        drafts.map((d) => ({
          ticket_id: d.ticket?.id || null,
          description: d.description.trim() || null,
        })),
      );
      setDrafts([]);
    } catch (err) {
      console.error("Failed to add focus:", err);
      alert(
        `Gagal menambah fokus: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Hapus check-in ini beserta semua fokusnya?")) return;
    setDeleting(true);
    try {
      await deleteCheckin();
      router.push("/checkin");
    } catch (err) {
      console.error("Failed to delete check-in:", err);
      alert(
        `Gagal menghapus: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !checkin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Check-in not found"}</p>
          <Button variant="secondary" onClick={() => router.push("/checkin")}>
            Back to Check In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/checkin")}
          >
            Back to Check In
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleDelete}
              loading={deleting}
              className="text-red-600 hover:bg-red-50"
            >
              Hapus Check-In
            </Button>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Check-In Detail
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {formatDateTime(checkin.created_at)}
        </p>

        {/* Info */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Employee" value={checkin.employee?.name || "-"} />
            <Field
              label="Divisi"
              value={checkin.division || checkin.employee?.division || "-"}
            />
          </div>
          <div className="mt-4">
            <label className="block text-xs text-slate-500 mb-1">
              Yesterday Problem
            </label>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">
              {checkin.yesterday_problem || "-"}
            </p>
          </div>
        </div>

        {/* Fokus hari ini */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Fokus Hari Ini
            </h2>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Search className="w-4 h-4" />}
                  onClick={() => setShowPicker(true)}
                >
                  Add Ticket
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={addTextDraft}
                >
                  Add Note
                </Button>
              </div>
            )}
          </div>

          {/* Item yang sudah tersimpan */}
          {checkin.items && checkin.items.length > 0 ? (
            <ul className="space-y-2 mb-4">
              {checkin.items.map((item) => (
                <li
                  key={item.id}
                  className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                >
                  {item.ticket ? (
                    <div
                      className="flex items-center gap-2 flex-wrap cursor-pointer hover:text-indigo-600"
                      onClick={() => router.push(`/gawean/${item.ticket?.id}`)}
                    >
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {item.ticket.ticket_id}
                      </span>
                      <span className="text-sm text-slate-700">
                        {item.ticket.subject}
                      </span>
                      <Badge variant="state" state={item.ticket.state} />
                    </div>
                  ) : (
                    <span className="text-sm text-slate-700">
                      {item.description}
                    </span>
                  )}
                  {item.ticket && item.description && (
                    <p className="text-xs text-slate-500 mt-1">
                      {item.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 mb-4">Belum ada fokus.</p>
          )}

          {/* Draft fokus baru (belum disimpan) */}
          {canManage && drafts.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Fokus baru (belum disimpan)
              </p>
              {drafts.map((d) => (
                <div
                  key={d.key}
                  className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {d.ticket ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-indigo-600">
                          {d.ticket.ticket_id}
                        </span>
                        <span className="text-sm text-slate-700">
                          {d.ticket.subject}
                        </span>
                        <Badge variant="state" state={d.ticket.state} />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">
                        Catatan bebas
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeDraft(d.key)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={d.description}
                    onChange={(e) => updateDraft(d.key, e.target.value)}
                    placeholder={
                      d.ticket
                        ? "Deskripsi tambahan (opsional)"
                        : "Tulis action item..."
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setDrafts([])}
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveDrafts}
                  loading={saving}
                >
                  Simpan Fokus
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <TicketPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={addTicketDraft}
        />
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function TicketPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (ticket: Ticket) => void;
}) {
  const [search, setSearch] = useState("");
  const { tickets, loading } = useTickets(
    {
      search,
      state: [
        "backlog",
        "todo",
        "need_fix",
        "on_progress",
        "code_review",
        "ready_for_qa",
        "in_qa",
        "ready_to_deploy",
        "cancel",
      ],
    },
    { page: 1, pageSize: 50, sortBy: "due_date", sortOrder: "asc" },
  );

  return (
    <Modal isOpen onClose={onClose} title="Add: Tickets">
      <div className="space-y-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari tiket berdasarkan subject..."
        />

        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
          {loading ? (
            <div className="p-6 text-center text-slate-500">Memuat tiket...</div>
          ) : tickets.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Tidak ada tiket"
                description="Tidak ada tiket aktif (state selain Done) yang cocok."
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 sticky top-0">
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">Subject</th>
                  <th className="p-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelect(ticket)}
                    className="hover:bg-indigo-50 cursor-pointer"
                  >
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {ticket.ticket_id}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{ticket.subject}</td>
                    <td className="p-3">
                      <Badge variant="state" state={ticket.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
