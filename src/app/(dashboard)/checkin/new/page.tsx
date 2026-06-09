"use client";

// =====================================================
// New Check-In Form — Daily Standup
//
// Employee & Divisi auto dari user login. Yesterday Problem
// bebas teks. Focus Today: pilih tiket (state != done) via modal
// + deskripsi opsional, atau action item teks bebas.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Search } from "lucide-react";
import { Button, Input, Modal, Badge, EmptyState } from "@/components/ui";
import { useSession } from "@/hooks/useSession";
import { useCheckins } from "@/hooks/useCheckins";
import { useTickets } from "@/hooks/useTickets";
import type { Ticket } from "@/types";

interface DraftItem {
  key: string;
  ticket: Ticket | null;
  description: string;
}

export default function NewCheckinPage() {
  const router = useRouter();
  const { session } = useSession();
  const profile = session?.profile;

  const { createCheckin } = useCheckins(true);

  const [yesterdayProblem, setYesterdayProblem] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const addTicketItem = (ticket: Ticket) => {
    // Hindari duplikat
    if (items.some((it) => it.ticket?.id === ticket.id)) {
      setShowPicker(false);
      return;
    }
    setItems((prev) => [
      ...prev,
      { key: `${ticket.id}-${Date.now()}`, ticket, description: "" },
    ]);
    setShowPicker(false);
  };

  const addTextItem = () => {
    setItems((prev) => [
      ...prev,
      { key: `text-${Date.now()}`, ticket: null, description: "" },
    ]);
  };

  const updateItemDescription = (key: string, value: string) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, description: value } : it)),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validasi: text item harus ada deskripsi
    const invalid = items.find((it) => !it.ticket && !it.description.trim());
    if (invalid) {
      alert("Action item teks bebas tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      await createCheckin({
        employee_id: profile.id,
        division: profile.division || null,
        yesterday_problem: yesterdayProblem.trim() || null,
        items: items.map((it, idx) => ({
          ticket_id: it.ticket?.id || null,
          description: it.description.trim() || null,
          sort_order: idx,
        })),
      });
      router.push("/checkin");
    } catch (err: any) {
      console.error("Failed to create check-in:", err);
      alert(`Gagal menyimpan check-in: ${err?.message || "Unknown error"}`);
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/checkin")}
            className="mb-4"
          >
            Back to Check In
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">New Check In</h1>
          <p className="text-slate-600 mt-1">
            Tandai fokus pekerjaan kamu hari ini
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Employee & Divisi (auto) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Employee
              </label>
              <p className="text-slate-900 font-medium">{profile.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Divisi
              </label>
              <p className="text-slate-900 font-medium">
                {profile.division || "-"}
              </p>
            </div>
          </div>

          {/* Yesterday Problem */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Yesterday Problem
            </label>
            <textarea
              value={yesterdayProblem}
              onChange={(e) => setYesterdayProblem(e.target.value)}
              rows={3}
              placeholder="Kendala kemarin (opsional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Focus Today */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-900">
                Focus Today
              </label>
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
                  onClick={addTextItem}
                >
                  Add Note
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-sm">
                Belum ada fokus. Tambahkan tiket atau catatan untuk hari ini.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      {item.ticket ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-indigo-600">
                            {item.ticket.ticket_id}
                          </span>
                          <span className="text-sm text-slate-700">
                            {item.ticket.subject}
                          </span>
                          <Badge variant="state" state={item.ticket.state} />
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          Catatan bebas
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItemDescription(item.key, e.target.value)
                      }
                      placeholder={
                        item.ticket
                          ? "Deskripsi tambahan (opsional)"
                          : "Tulis action item..."
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => router.push("/checkin")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save Check-In
            </Button>
          </div>
        </div>
      </div>

      {showPicker && (
        <TicketPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={addTicketItem}
        />
      )}
    </div>
  );
}

// ─── Ticket Picker Modal (state != done) ─────────────

function TicketPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (ticket: Ticket) => void;
}) {
  const [search, setSearch] = useState("");

  // Ambil tiket dengan state selain done (sesuai aturan ERP).
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
            <div className="p-6 text-center text-slate-500">
              Memuat tiket...
            </div>
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
