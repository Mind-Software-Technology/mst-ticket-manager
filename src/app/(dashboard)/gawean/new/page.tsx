"use client";

// =====================================================
// Create Ticket Page
// Sprint 3 / Gawean Module
//
// Form untuk create ticket baru dengan auto ticket ID.
// =====================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, Paperclip, X } from "lucide-react";
import { Button, Input, Select, EmptyState, RichTextEditor } from "@/components/ui";
import { DESCRIPTION_TEMPLATE, isEmptyHtml } from "@/lib/rich-text";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useProjects } from "@/hooks/useProjects";
import { useSprints } from "@/hooks/useSprints";
import { useUsers } from "@/hooks/useUsers";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/utils/supabase/client";
import { generateTicketId } from "@/lib/ticket-id-generator";
import {
  TICKET_STATES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  MANHOURS_OPTIONS,
  ACCEPTED_ATTACHMENT_TYPES,
  MAX_TICKET_ATTACHMENT_SIZE_BYTES,
} from "@/lib/constants";
import {
  uploadTicketAttachments,
  validateAttachment,
  formatFileSize,
} from "@/lib/ticket-attachments";
import type { TicketState, TicketPriority, TicketCategory } from "@/types";

export default function CreateTicketPage() {
  const router = useRouter();
  const { session } = useSession();

  // Hooks untuk master data
  const { clients, loading: loadingClients } = useClients();
  const { products, loading: loadingProducts } = useProducts();
  const { projects, loading: loadingProjects } = useProjects();
  const { sprints, loading: loadingSprints } = useSprints();
  const { users, loading: loadingUsers } = useUsers(true); // Active users only

  const isAdmin = !!session?.profile?.is_admin;
  const canCreateTicket = isAdmin || session?.email === "gema@mst.id";

  const [saving, setSaving] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const valid: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateAttachment(f);
      if (err) {
        alert(err);
        continue;
      }
      valid.push(f);
    }
    setAttachmentFiles((prev) => [...prev, ...valid]);
    e.target.value = ""; // reset agar file yang sama bisa dipilih lagi
  };

  const handleRemoveFile = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Form state
  const [formData, setFormData] = useState({
    client_id: "",
    product_id: "",
    project_id: "",
    sprint_id: "",
    subject: "",
    description: DESCRIPTION_TEMPLATE,
    category: "development" as TicketCategory,
    state: "backlog" as TicketState,
    priority: "normal" as TicketPriority,
    assigned_to: "",
    reported_to: session?.profile?.id || "",
    manhours_estimate: "",
    start_date: "",
    due_date: "",
    need_qa: false,
  });

  // Filter products by selected client
  const filteredProducts = formData.client_id
    ? products.filter((p) => p.client_id === formData.client_id)
    : products;

  // Filter projects by selected product/client
  const filteredProjects = projects.filter((proj) => {
    if (formData.product_id && proj.product_id !== formData.product_id)
      return false;
    if (formData.client_id && proj.client_id !== formData.client_id)
      return false;
    return true;
  });

  // Ticket ID di-generate ATOMIK di server saat submit (lihat handleSubmit).
  // Di sini cukup tampilkan preview prefix supaya user tahu format ID-nya
  // tanpa mengalokasikan nomor (yang akan membakar sequence kalau batal).
  const selectedProduct =
    products.find((p) => p.id === formData.product_id) ?? null;
  const ticketIdPreview = selectedProduct?.prefix
    ? `${selectedProduct.prefix.toUpperCase()}-•••`
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.client_id) {
      alert("Please select a client");
      return;
    }
    if (!formData.product_id) {
      alert("Please select a product");
      return;
    }
    if (!formData.subject.trim()) {
      alert("Please enter a subject");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      // Alokasikan ticket ID + sequence secara atomik di server (race-safe).
      const { ticketId, sequence } = await generateTicketId(formData.product_id);

      // Create ticket
      const { data: newTicket, error: createError } = await supabase
        .from("tickets")
        .insert({
          ticket_id: ticketId,
          sequence: sequence,
          subject: formData.subject.trim(),
          description: isEmptyHtml(formData.description)
            ? null
            : formData.description,
          category: formData.category,
          state: formData.state,
          priority: formData.priority,
          client_id: formData.client_id || null,
          product_id: formData.product_id || null,
          project_id: formData.project_id || null,
          sprint_id: formData.sprint_id || null,
          assigned_to: formData.assigned_to || null,
          reported_to: formData.reported_to || null,
          manhours_estimate: parseFloat(formData.manhours_estimate) || 0,
          actual_manhours: 0,
          start_date: formData.start_date || null,
          due_date: formData.due_date || null,
          need_qa: formData.need_qa,
          created_by: session?.profile?.id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      // Upload lampiran (kalau ada). Tiket sudah dibuat, jadi kegagalan
      // upload tidak membatalkan tiket — cukup beri tahu user.
      if (attachmentFiles.length > 0) {
        try {
          await uploadTicketAttachments(
            supabase,
            newTicket.id,
            attachmentFiles,
            session?.profile?.id ?? null,
          );
        } catch (attErr) {
          console.error("Failed to upload attachments:", attErr);
          alert(
            "Tiket berhasil dibuat, tapi sebagian lampiran gagal diunggah. Kamu bisa menambahkannya lagi di halaman detail tiket.",
          );
        }
      }

      // Log activity (fire and forget)
      void supabase.from("activity_logs").insert({
        ticket_id: newTicket.id,
        user_id: session?.profile?.id || null,
        action_type: "created",
        message: `Ticket created: ${ticketId}`,
        created_at: new Date().toISOString(),
      });

      // Redirect to ticket detail
      router.push(`/gawean/${newTicket.id}`);
    } catch (err) {
      console.error("Failed to create ticket:", err);
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Unknown error";
      alert(`Failed to create ticket: ${message}. Please try again.`);
      setSaving(false);
    }
  };

  // Loading state
  if (
    loadingClients ||
    loadingProducts ||
    loadingProjects ||
    loadingSprints ||
    loadingUsers
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  // Empty state - no clients/products
  if (clients.length === 0 || products.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/gawean")}
            className="mb-4"
          >
            Back to Tickets
          </Button>

          <EmptyState
            icon={Plus}
            title="Setup Required"
            description={
              clients.length === 0
                ? "Please create at least one Client in Config before creating tickets."
                : "Please create at least one Product in Config before creating tickets."
            }
            action={
              <Button
                variant="primary"
                onClick={() =>
                  router.push(
                    clients.length === 0
                      ? "/config/clients"
                      : "/config/products",
                  )
                }
              >
                Go to Config
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => router.push("/gawean")}
            className="mb-4"
          >
            Back to Tickets
          </Button>

          <h1 className="text-2xl font-bold text-slate-900">
            Create New Ticket
          </h1>
          <p className="text-slate-600 mt-1">
            Fill in the details below to create a new ticket
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Basic Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Client & Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Client"
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      client_id: e.target.value,
                      product_id: "", // Reset product
                      project_id: "", // Reset project
                    })
                  }
                  options={[
                    { value: "", label: "-- Select Client --" },
                    ...clients.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  required
                />

                <Select
                  label="Product"
                  value={formData.product_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      product_id: e.target.value,
                      project_id: "", // Reset project
                    })
                  }
                  options={[
                    { value: "", label: "-- Select Product --" },
                    ...filteredProducts.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  required
                  disabled={!formData.client_id}
                />
              </div>

              {/* Ticket ID preview — nomor final dialokasikan saat submit */}
              {ticketIdPreview && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ticket ID
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-2">
                    <span className="font-mono text-indigo-600 font-semibold">
                      {ticketIdPreview}
                    </span>
                    <span className="text-xs text-slate-500">
                      — nomor dibuat otomatis saat disimpan
                    </span>
                  </div>
                </div>
              )}

              {/* Project & Sprint */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Project (Optional)"
                  value={formData.project_id}
                  onChange={(e) =>
                    setFormData({ ...formData, project_id: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- No Project --" },
                    ...filteredProjects.map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                  disabled={!formData.product_id && !formData.client_id}
                />

                <Select
                  label="Sprint (Optional)"
                  value={formData.sprint_id}
                  onChange={(e) =>
                    setFormData({ ...formData, sprint_id: e.target.value })
                  }
                  options={[
                    { value: "", label: "-- No Sprint --" },
                    ...sprints.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Card: Ticket Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Ticket Details
            </h2>

            <div className="space-y-4">
              <Input
                label="Subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Brief description of the task"
                required
                maxLength={500}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) =>
                    setFormData({ ...formData, description: html })
                  }
                  placeholder="Detailed description, requirements, or notes"
                  minHeightClass="min-h-[240px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as TicketCategory,
                    })
                  }
                  options={TICKET_CATEGORIES.map((c) => ({
                    value: c.value,
                    label: c.label,
                  }))}
                />

                <Select
                  label="Priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as TicketPriority,
                    })
                  }
                  options={TICKET_PRIORITIES.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />

                <Select
                  label="State"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      state: e.target.value as TicketState,
                    })
                  }
                  options={TICKET_STATES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Card: Assignment */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Assignment
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Assignee (Optional)"
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData({ ...formData, assigned_to: e.target.value })
                }
                options={[
                  { value: "", label: "-- Unassigned --" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />

              <Select
                label="Reporter"
                value={formData.reported_to}
                onChange={(e) =>
                  setFormData({ ...formData, reported_to: e.target.value })
                }
                options={[
                  { value: "", label: "-- No Reporter --" },
                  ...users.map((u) => ({ value: u.id, label: u.name })),
                ]}
              />
            </div>
          </div>

          {/* Card: Time & Effort */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Time & Effort
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Estimate (hours)"
                  value={formData.manhours_estimate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manhours_estimate: e.target.value,
                    })
                  }
                  options={[
                    { value: "", label: "Pilih manhours" },
                    ...MANHOURS_OPTIONS.map((h) => ({
                      value: String(h),
                      label: String(h),
                    })),
                  ]}
                />

                <Input
                  label="Start Date (Optional)"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />

                <Input
                  label="Due Date (Optional)"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>

              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={formData.need_qa}
                  onChange={(e) =>
                    setFormData({ ...formData, need_qa: e.target.checked })
                  }
                  className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700">This ticket needs QA testing</span>
              </label>
            </div>
          </div>

          {/* Card: Attachment (admin & authorized users) */}
          {canCreateTicket && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-1">
                <Paperclip className="w-4 h-4 text-slate-400" />
                Attachment (Optional)
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Lampirkan gambar atau video. Maksimal{" "}
                {Math.round(MAX_TICKET_ATTACHMENT_SIZE_BYTES / 1024 / 1024)}MB
                per file.
              </p>

              <input
                type="file"
                accept={ACCEPTED_ATTACHMENT_TYPES}
                multiple
                onChange={handleAddFiles}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />

              {attachmentFiles.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {attachmentFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        📎 {f.name}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatFileSize(f.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        title="Hapus"
                        className="ml-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/gawean")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={!formData.product_id || saving}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
