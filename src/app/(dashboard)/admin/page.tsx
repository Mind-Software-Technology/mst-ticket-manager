"use client";

// =====================================================
// Admin Dashboard — Ticket Management (Refactored)
//
// Sebelumnya menggunakan tabel `tasks` (legacy Sprint 1).
// Sekarang refactored untuk menggunakan tabel `tickets`
// (sama dengan modul Gawean) agar data konsisten.
// =====================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useUsers } from "@/hooks/useUsers";
import { useSprints } from "@/hooks/useSprints";
import { useProducts } from "@/hooks/useProducts";
import { RichTextEditor, SearchInput, Pagination } from "@/components/ui";
import { isEmptyHtml } from "@/lib/rich-text";
import { toISODate } from "@/lib/date-utils";
import { DEFAULT_PAGE_SIZE, MANHOURS_OPTIONS } from "@/lib/constants";
import type { Ticket } from "@/types";

// ─── Constants ────────────────────────────────────────

const DIVISIONS = ["Marketing", "Design", "Development", "Business", "Project"];

const STATE_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "backlog", label: "Backlog", color: "bg-slate-100 text-slate-700" },
  { value: "todo", label: "ToDo", color: "bg-indigo-100 text-indigo-700" },
  { value: "on_progress", label: "Sedang Dikerjakan", color: "bg-blue-100 text-blue-700" },
  { value: "need_fix", label: "Need Fix", color: "bg-amber-100 text-amber-700" },
  { value: "code_review", label: "Code Review", color: "bg-purple-100 text-purple-700" },
  { value: "ready_for_qa", label: "Ready for QA", color: "bg-cyan-100 text-cyan-700" },
  { value: "in_qa", label: "In QA", color: "bg-teal-100 text-teal-700" },
  { value: "ready_to_deploy", label: "Ready to Deploy", color: "bg-emerald-100 text-emerald-700" },
  { value: "done", label: "Selesai", color: "bg-green-100 text-green-700" },
  { value: "cancel", label: "Cancel", color: "bg-red-100 text-red-700" },
];

const PRIORITY_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: "low", label: "Rendah", color: "bg-slate-100 text-slate-600" },
  { value: "normal", label: "Normal", color: "bg-indigo-100 text-indigo-700" },
  { value: "high", label: "Tinggi", color: "bg-orange-100 text-orange-700" },
  { value: "critical", label: "Kritis", color: "bg-red-100 text-red-700" },
];

// Filter tenggat (due date) untuk membantu admin memantau tiket mendesak.
const DUE_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "today", label: "Hari Ini" },
  { value: "soon", label: "≤ 3 Hari" },
];

const CATEGORY_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "design_ui_ux", label: "Design / UI-UX" },
  { value: "service_support", label: "Service Support" },
  { value: "finance_sales", label: "Finance & Sales" },
  { value: "infrastructure_operations", label: "Infrastructure & Ops" },
  { value: "qa_testing", label: "QA & Testing" },
  { value: "coordination_management", label: "Coordination & Management" },
  { value: "internal_learning", label: "Internal Learning" },
  { value: "marketing", label: "Marketing" },
];

// ─── Task Form State ──────────────────────────────────

interface TicketFormState {
  ticket_id: string;
  subject: string;
  description: string;
  division: string;
  assigned_to: string;
  priority: string;
  state: string;
  category: string;
  start_date: string;
  due_date: string;
  manhours_estimate: string;
  sprint_id: string;
  product_id: string;
}

const INITIAL_FORM: TicketFormState = {
  ticket_id: "",
  subject: "",
  description: "",
  division: "Development",
  assigned_to: "",
  priority: "normal",
  state: "backlog",
  category: "development",
  start_date: "",
  due_date: "",
  manhours_estimate: "",
  sprint_id: "",
  product_id: "",
};

// ─── Helper: Generate Ticket ID ──────────────────────

const DIVISION_CODE_MAP: Record<string, string> = {
  Marketing: "MKT",
  Design: "DSN",
  Development: "DEV",
  Business: "BIZ",
  Project: "PRJ",
};

function divisionPrefix(division: string): string {
  return `SPT1-${DIVISION_CODE_MAP[division] || "GEN"}`;
}

// Hitung ID berikutnya dari daftar ticket_id untuk prefix divisi.
// CATATAN: belum atomik (dua admin bersamaan bisa bentrok) — itu item terpisah
// "generator ID atomik". Yang penting di sini: TIDAK bergantung pada list tiket
// yang kini terpaginasi; pemanggil memberi daftar ID hasil query khusus prefix.
function computeNextTicketId(
  division: string,
  existingIds: Array<{ ticket_id: string }>,
): string {
  const prefix = divisionPrefix(division);
  let maxNum = 0;
  for (const t of existingIds) {
    if (t.ticket_id && t.ticket_id.startsWith(prefix)) {
      const parsedNum = parseInt(t.ticket_id.slice(prefix.length), 10);
      if (!isNaN(parsedNum) && parsedNum > maxNum) {
        maxNum = parsedNum;
      }
    }
  }
  return `${prefix}${maxNum + 1}`;
}

// ═══════════════════════════════════════════════════════
// ADMIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { session } = useSession();
  const { users } = useUsers();
  const { sprints } = useSprints();
  const { products } = useProducts();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dueFilter, setDueFilter] = useState("all");

  // Pagination server-side (hindari memuat seluruh tabel tickets)
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Statistik global (count terpisah, independen dari halaman & filter daftar)
  const [statCounts, setStatCounts] = useState({ total: 0, done: 0, progres: 0 });

  const userRole = session?.profile.is_admin ? "Admin" : "Viewer";

  const [formData, setFormData] = useState<TicketFormState>(INITIAL_FORM);

  // ─── Fetch Tickets (paginated + server-side filter) ─

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          assignee:users!tickets_assigned_to_fkey(id, name, email),
          sprint:sprints(id, name)
        `,
          { count: "exact" },
        );

      // Pencarian: ID tiket OR subject OR nama assignee — sama seperti sebelumnya,
      // tapi kini di server. Nama assignee di-resolve ke daftar ID lebih dulu.
      const term = searchQuery.trim();
      if (term) {
        const { data: matchedUsers } = await supabase
          .from("users")
          .select("id")
          .ilike("name", `%${term}%`);
        const assigneeIds = (matchedUsers ?? []).map((u) => u.id as string);

        // Bersihkan karakter yang merusak sintaks filter `or` PostgREST.
        const safe = term.replace(/[,()*%"\\]/g, " ").trim();
        const orParts = [`ticket_id.ilike.%${safe}%`, `subject.ilike.%${safe}%`];
        if (assigneeIds.length > 0) {
          orParts.push(`assigned_to.in.(${assigneeIds.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }

      // Filter tenggat (due_date = kolom date)
      if (dueFilter === "today") {
        query = query.eq("due_date", toISODate());
      } else if (dueFilter === "soon") {
        const soon = new Date();
        soon.setDate(soon.getDate() + 3);
        query = query
          .gte("due_date", toISODate())
          .lte("due_date", toISODate(soon));
      }

      const from = (page - 1) * DEFAULT_PAGE_SIZE;
      const to = from + DEFAULT_PAGE_SIZE - 1;
      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTickets((data as Ticket[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("[admin] fetch tickets error:", err);
      setTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, dueFilter]);

  // ─── Fetch Stats (count global, head-only — murah) ──

  const fetchStats = useCallback(async () => {
    try {
      const supabase = createClient();
      const [totalRes, doneRes, progresRes] = await Promise.all([
        supabase.from("tickets").select("*", { count: "exact", head: true }),
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("state", "done"),
        supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .in("state", ["on_progress", "code_review", "in_qa"]),
      ]);
      setStatCounts({
        total: totalRes.count ?? 0,
        done: doneRes.count ?? 0,
        progres: progresRes.count ?? 0,
      });
    } catch (err) {
      console.error("[admin] fetch stats error:", err);
    }
  }, []);

  // ID tiket berikutnya — query khusus prefix divisi (bukan dari list terpaginasi).
  const fetchNextTicketId = useCallback(
    async (division: string): Promise<string> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tickets")
        .select("ticket_id")
        .ilike("ticket_id", `${divisionPrefix(division)}%`);
      return computeNextTicketId(
        division,
        (data as Array<{ ticket_id: string }>) ?? [],
      );
    },
    [],
  );

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ─── Stats ────────────────────────────────────────

  const stats = [
    { label: "Total Tugas", value: statCounts.total, color: "text-indigo-600" },
    { label: "Selesai", value: statCounts.done, color: "text-green-600" },
    { label: "Progres", value: statCounts.progres, color: "text-blue-600" },
    {
      label: "Sprint Aktif",
      value: sprints.filter((s) => s.status === "Aktif").length,
      color: "text-purple-600",
    },
  ];

  // ─── Create / Update Ticket ───────────────────────

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = createClient();

      const ticketData: Record<string, unknown> = {
        ticket_id: formData.ticket_id,
        subject: formData.subject,
        description: isEmptyHtml(formData.description)
          ? null
          : formData.description,
        division: formData.division,
        assigned_to: formData.assigned_to || null,
        priority: formData.priority,
        state: formData.state,
        category: formData.category,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        manhours_estimate: parseFloat(formData.manhours_estimate) || 0,
        sprint_id: formData.sprint_id || null,
        product_id: formData.product_id || null,
        updated_at: new Date().toISOString(),
      };

      if (editingTicketId) {
        // Update
        const { error } = await supabase
          .from("tickets")
          .update(ticketData)
          .eq("id", editingTicketId);
        if (error) throw error;
      } else {
        // Create
        ticketData.created_at = new Date().toISOString();
        ticketData.created_by = session?.profile?.id || null;
        const { error } = await supabase.from("tickets").insert([ticketData]);
        if (error) throw error;
      }

      closeModal();
      await Promise.all([fetchTickets(), fetchStats()]);
    } catch (err) {
      console.error("[admin] save ticket failed:", err);
      alert("Gagal menyimpan tugas. Cek koneksi Supabase.");
    }
  };

  // ─── Delete Ticket ────────────────────────────────

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm("Apakah kamu yakin ingin menghapus tugas ini?")) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);
      if (error) throw error;
      await Promise.all([fetchTickets(), fetchStats()]);
    } catch (err) {
      console.error("[admin] delete ticket failed:", err);
      alert("Gagal menghapus tugas. Cek koneksi Supabase.");
    }
  };

  // ─── Modal Helpers ────────────────────────────────

  const openEditModal = (ticket: Ticket) => {
    setFormData({
      ticket_id: ticket.ticket_id,
      subject: ticket.subject,
      description: ticket.description || "",
      division: ticket.division || "Development",
      assigned_to: ticket.assigned_to || "",
      priority: ticket.priority,
      state: ticket.state,
      category: ticket.category,
      start_date: ticket.start_date || "",
      due_date: ticket.due_date || "",
      manhours_estimate: ticket.manhours_estimate
        ? String(ticket.manhours_estimate)
        : "",
      sprint_id: ticket.sprint_id || "",
      product_id: ticket.product_id || "",
    });
    setEditingTicketId(ticket.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTicketId(null);
  };

  // ─── Lookup Helpers ───────────────────────────────

  const getStateDisplay = (state: string) => {
    const s = STATE_OPTIONS.find((o) => o.value === state);
    return s || { label: state, color: "bg-slate-100 text-slate-700" };
  };

  const getPriorityDisplay = (priority: string) => {
    const p = PRIORITY_OPTIONS.find((o) => o.value === priority);
    return p || { label: priority, color: "bg-slate-100 text-slate-600" };
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Master Tiket {userRole === "Viewer" ? "(Mode Tamu)" : "(Admin)"}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            {userRole === "Viewer"
              ? "Lihat seluruh daftar tugas dan progress sprint startup."
              : "Kelola seluruh tugas dan sprint startup."}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500 mb-1">
              {stat.label}
            </p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Ticket Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h3 className="font-semibold text-slate-800">Daftar Tugas Aktif</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Filter tenggat */}
            <div className="flex items-center gap-1.5">
              {DUE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setDueFilter(f.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    dueFilter === f.value
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* Pencarian — debounced (300ms), difilter di server */}
            <SearchInput
              value={searchQuery}
              onChange={(v) => {
                setSearchQuery(v);
                setPage(1);
              }}
              placeholder="Cari tugas..."
              className="w-full sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-medium">ID Tugas</th>
                <th className="p-4 font-medium">Judul</th>
                <th className="p-4 font-medium">PIC</th>
                <th className="p-4 font-medium">Tenggat</th>
                <th className="p-4 font-medium">Prioritas</th>
                <th className="p-4 font-medium">Status</th>
                {userRole !== "Viewer" && (
                  <th className="p-4 font-medium">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {searchQuery || dueFilter !== "all"
                      ? "Tidak ada tugas yang cocok dengan filter."
                      : "Belum ada tugas."}
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const stateDisplay = getStateDisplay(ticket.state);
                  const priorityDisplay = getPriorityDisplay(ticket.priority);

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-medium text-slate-900">
                        {ticket.ticket_id}
                      </td>
                      <td className="p-4 text-slate-700 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {ticket.assignee?.name || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {ticket.due_date
                          ? new Date(ticket.due_date).toLocaleDateString(
                              "id-ID"
                            )
                          : "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${priorityDisplay.color}`}
                        >
                          {priorityDisplay.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${stateDisplay.color}`}
                        >
                          {stateDisplay.label}
                        </span>
                      </td>
                      {userRole !== "Viewer" && (
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => openEditModal(ticket)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              aria-label="Edit"
                              title="Edit Tugas"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              aria-label="Hapus"
                              title="Hapus Tugas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination server-side */}
        {!loading && tickets.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalCount / DEFAULT_PAGE_SIZE)}
            pageSize={DEFAULT_PAGE_SIZE}
            totalItems={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* ─── Modal Tambah/Edit Tugas ─────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTicketId ? "Edit Tugas" : "Tambah Tugas Baru"}
              </h2>
            </div>
            <form onSubmit={handleSaveTicket} className="p-6 space-y-4">
              {/* Row 1: ID & Division */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ID Tugas
                  </label>
                  <input
                    required
                    readOnly
                    type="text"
                    value={formData.ticket_id}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 font-semibold cursor-not-allowed"
                    title="ID Tugas dibuat otomatis"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Dibuat otomatis dari Divisi
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Divisi
                  </label>
                  <select
                    value={formData.division}
                    onChange={async (e) => {
                      const newDiv = e.target.value;
                      // Saat edit: ID tidak berubah. Saat create: generate dari
                      // query khusus prefix (bukan dari list yang terpaginasi).
                      if (editingTicketId) {
                        setFormData((f) => ({ ...f, division: newDiv }));
                        return;
                      }
                      const newId = await fetchNextTicketId(newDiv);
                      setFormData((f) => ({
                        ...f,
                        division: newDiv,
                        ticket_id: newId,
                      }));
                    }}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Judul Tugas
                </label>
                <textarea
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Description — rich text */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Deskripsi
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) =>
                    setFormData({ ...formData, description: html })
                  }
                  placeholder="Tulis deskripsi pekerjaan..."
                  minHeightClass="min-h-[180px]"
                />
              </div>

              {/* Row 2: PIC & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    PIC (Penanggung Jawab)
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Belum di-assign --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Status & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {STATE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Sprint & Product */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sprint
                  </label>
                  <select
                    value={formData.sprint_id}
                    onChange={(e) =>
                      setFormData({ ...formData, sprint_id: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Tanpa Sprint --</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.status === "Aktif" ? "✅" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Manhours Estimasi
                  </label>
                  <select
                    value={formData.manhours_estimate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        manhours_estimate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">Pilih manhours</option>
                    {/* Nilai lama yang tidak ada di daftar standar tetap tampil */}
                    {formData.manhours_estimate &&
                      !MANHOURS_OPTIONS.includes(
                        Number(formData.manhours_estimate),
                      ) && (
                        <option value={formData.manhours_estimate}>
                          {formData.manhours_estimate}
                        </option>
                      )}
                    {MANHOURS_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Berakhir (Tenggat)
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
