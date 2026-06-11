"use client";

// =====================================================
// Ticket Detail Page — View & Inline Edit
//
// Gaya ERP "Gawean": field bisa di-edit langsung (inline) tanpa
// mode toggle. State dropdown bebas (any → any). Reported To &
// Assignee bisa diubah. Tombol Progress untuk reply yang masuk
// ke activity log (chatter) di sisi kanan.
// =====================================================

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, MessageSquarePlus } from "lucide-react";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { useUsers } from "@/hooks/useUsers";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useProjects } from "@/hooks/useProjects";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/utils/supabase/client";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { TicketAttachments } from "@/components/TicketAttachments";
import { Badge, Button, Modal } from "@/components/ui";
import {
  TICKET_STATES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  STORAGE_BUCKET_TICKET_ATTACHMENTS,
} from "@/lib/constants";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id as string;

  const { session } = useSession();
  const { ticket, loading, error, updateTicket, refresh } =
    useTicketDetail(ticketId, session?.profile?.id);
  const isAdmin = !!session?.profile?.is_admin;
  const { users } = useUsers(true);
  const { clients } = useClients();
  const { products } = useProducts();
  const { projects } = useProjects();

  const [saving, setSaving] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [sendingProgress, setSendingProgress] = useState(false);
  const [progressFile, setProgressFile] = useState<File | null>(null);
  // Bump untuk memaksa ActivityTimeline reload setelah ada reply baru
  const [timelineKey, setTimelineKey] = useState(0);

  // Local description editing
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");

  useEffect(() => {
    if (ticket) {
      setDescription(ticket.description || "");
      setSubject(ticket.subject || "");
    }
  }, [ticket?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Inline auto-save helper
  const saveField = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      await updateTicket(updates);
      setTimelineKey((k) => k + 1); // refresh activity log
    } catch (err) {
      console.error("Failed to update ticket:", err);
      alert("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleStateChange = async (newState: string) => {
    if (!ticket || newState === ticket.state) return;
    const updates: Record<string, any> = { state: newState };
    if (newState === "done") {
      updates.done_date = new Date().toISOString().split("T")[0];
    }
    await saveField(updates);
  };

  const handleSendProgress = async () => {
    if (!ticket) return;
    if (!progressText.trim() && !progressFile) return;
    setSendingProgress(true);
    try {
      const supabase = createClient();

      // Upload foto (opsional) ke storage → ambil public URL
      let imageUrl: string | null = null;
      if (progressFile) {
        const ext = progressFile.name.split(".").pop() || "png";
        const path = `${ticket.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET_TICKET_ATTACHMENTS)
          .upload(path, progressFile);
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage
          .from(STORAGE_BUCKET_TICKET_ATTACHMENTS)
          .getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { error: insertErr } = await supabase
        .from("activity_logs")
        .insert({
          ticket_id: ticket.id,
          user_id: session?.profile?.id || null,
          action_type: "comment",
          message: progressText.trim() || null,
          image_url: imageUrl,
          created_at: new Date().toISOString(),
        });
      if (insertErr) throw insertErr;

      setProgressText("");
      setProgressFile(null);
      setShowProgress(false);
      setTimelineKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to send progress:", err);
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Unknown error";
      alert(`Gagal mengirim: ${msg}`);
    } finally {
      setSendingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Ticket not found"}</p>
          <Button variant="secondary" onClick={() => router.push("/gawean")}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const userOptions = users.map((u) => ({ value: u.id, label: u.name }));

  // Client/Product/Project bertingkat (filter mengikuti pilihan di atasnya)
  const filteredProducts = ticket.client_id
    ? products.filter((p) => p.client_id === ticket.client_id)
    : products;
  const filteredProjects = projects.filter((proj) => {
    if (ticket.product_id && proj.product_id !== ticket.product_id) return false;
    if (ticket.client_id && proj.client_id !== ticket.client_id) return false;
    return true;
  });

  const handleClientChange = (clientId: string) => {
    // Ganti client → reset product & project agar tetap konsisten
    saveField({
      client_id: clientId || null,
      product_id: null,
      project_id: null,
    });
  };

  const handleProductChange = (productId: string) => {
    saveField({ product_id: productId || null, project_id: null });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push("/gawean")}
            >
              Back to Tickets
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<MessageSquarePlus className="w-4 h-4" />}
              onClick={() => setShowProgress(true)}
            >
              Progress
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-indigo-600">
              {ticket.ticket_id}
            </span>
            <Badge variant="state" state={ticket.state} />
            <Badge variant="priority" priority={ticket.priority} />
            {saving && (
              <span className="text-xs text-slate-400">Menyimpan...</span>
            )}
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={() => {
              if (subject.trim() && subject !== ticket.subject) {
                void saveField({ subject: subject.trim() });
              }
            }}
            className="text-2xl font-bold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Ticket Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Category — editable */}
                <InlineSelect
                  label="Category"
                  value={ticket.category}
                  options={TICKET_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                  onChange={(v) => saveField({ category: v })}
                />

                {/* State — editable, bebas */}
                <InlineSelect
                  label="State"
                  value={ticket.state}
                  options={TICKET_STATES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                  onChange={handleStateChange}
                />

                {/* Priority — editable */}
                <InlineSelect
                  label="Priority"
                  value={ticket.priority}
                  options={TICKET_PRIORITIES.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                  onChange={(v) => saveField({ priority: v })}
                />

                {/* Reported To — editable */}
                <InlineSelect
                  label="Reported To"
                  value={ticket.reported_to || ""}
                  options={[
                    { value: "", label: "-- Tidak ada --" },
                    ...userOptions,
                  ]}
                  onChange={(v) => saveField({ reported_to: v || null })}
                />

                {/* Assignee — editable */}
                <InlineSelect
                  label="Assignee"
                  value={ticket.assigned_to || ""}
                  options={[
                    { value: "", label: "-- Unassigned --" },
                    ...userOptions,
                  ]}
                  onChange={(v) => saveField({ assigned_to: v || null })}
                />

                {/* Client — editable */}
                <InlineSelect
                  label="Client"
                  value={ticket.client_id || ""}
                  options={[
                    { value: "", label: "-- Tidak ada --" },
                    ...clients.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  onChange={handleClientChange}
                />

                {/* Product — editable (difilter by client) */}
                <InlineSelect
                  label="Product"
                  value={ticket.product_id || ""}
                  options={[
                    { value: "", label: "-- Tidak ada --" },
                    ...filteredProducts.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  onChange={handleProductChange}
                />

                {/* Project — editable (difilter by product/client) */}
                <InlineSelect
                  label="Project"
                  value={ticket.project_id || ""}
                  options={[
                    { value: "", label: "-- Tidak ada --" },
                    ...filteredProjects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  onChange={(v) => saveField({ project_id: v || null })}
                />

                <ReadOnlyField
                  label="Divisi"
                  value={ticket.division || ticket.assignee?.division}
                />
                <ReadOnlyField label="Sprint" value={ticket.sprint?.name} />
                <ReadOnlyField
                  label="Due Date"
                  value={formatDate(ticket.due_date)}
                />

                {/* Done Date — editable */}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Done Date
                  </label>
                  <input
                    type="date"
                    value={ticket.done_date || ""}
                    onChange={(e) =>
                      saveField({ done_date: e.target.value || null })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <ReadOnlyField
                  label="Manhours"
                  value={`${ticket.manhours_estimate || 0}h (aktual ${
                    ticket.actual_manhours || 0
                  }h)`}
                />
              </div>

              {/* Description — editable */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    if (description !== (ticket.description || "")) {
                      void saveField({ description: description || null });
                    }
                  }}
                  rows={8}
                  placeholder="Tulis deskripsi pekerjaan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Attachment — download untuk semua, admin bisa tambah/hapus */}
            <TicketAttachments
              ticketId={ticket.id}
              attachments={ticket.attachments ?? []}
              canManage={isAdmin}
              uploadedBy={session?.profile?.id ?? null}
              onChanged={() => void refresh()}
            />
          </div>

          {/* Sidebar: Activity Log / Chatter */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Activity Log
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<MessageSquarePlus className="w-4 h-4" />}
                  onClick={() => setShowProgress(true)}
                >
                  Reply
                </Button>
              </div>
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                <ActivityTimeline key={timelineKey} ticketId={ticket.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Reply Modal */}
      {showProgress && (
        <Modal
          isOpen={showProgress}
          onClose={() => setShowProgress(false)}
          title="Progress / Reply"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Tulis apa yang sudah kamu kerjakan. Pesan akan muncul di log
              aktivitas tiket ini.
            </p>
            <textarea
              value={progressText}
              onChange={(e) => setProgressText(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Contoh: Sudah selesai implementasi endpoint & self-test."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProgressFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />
              {progressFile && (
                <p className="mt-1 text-xs text-slate-500">
                  📎 {progressFile.name}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowProgress(false)}
                disabled={sendingProgress}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSendProgress}
                loading={sendingProgress}
                disabled={!progressText.trim() && !progressFile}
              >
                Send
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Inline editable select ──────────────────────────

function InlineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Read-only field ─────────────────────────────────

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <p className="text-sm font-medium text-slate-900 py-2">{value || "-"}</p>
    </div>
  );
}
