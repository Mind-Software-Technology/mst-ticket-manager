"use client";

// =====================================================
// Create Ticket Page
// Sprint 3 / Gawean Module
//
// Form untuk create ticket baru dengan auto ticket ID.
// =====================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button, Input, Select, EmptyState } from "@/components/ui";
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
} from "@/lib/constants";
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

  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    client_id: "",
    product_id: "",
    project_id: "",
    sprint_id: "",
    ticket_id: "",
    sequence: 0,
    subject: "",
    description: "",
    category: "development" as TicketCategory,
    state: "backlog" as TicketState,
    priority: "normal" as TicketPriority,
    assigned_to: "",
    reported_to: session?.profile?.id || "",
    manhours_estimate: 0,
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

  // Auto-generate ticket ID when product changes
  useEffect(() => {
    if (formData.product_id) {
      setGeneratingId(true);
      generateTicketId(formData.product_id)
        .then((result) => {
          setFormData((prev) => ({
            ...prev,
            ticket_id: result.ticketId,
            sequence: result.sequence,
          }));
        })
        .catch((err) => {
          console.error("Failed to generate ticket ID:", err);
          alert("Failed to generate ticket ID. Please try again.");
        })
        .finally(() => {
          setGeneratingId(false);
        });
    } else {
      setFormData((prev) => ({ ...prev, ticket_id: "", sequence: 0 }));
    }
  }, [formData.product_id]);

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
      // Create ticket
      const { data: newTicket, error: createError } = await supabase
        .from("tickets")
        .insert({
          ticket_id: formData.ticket_id,
          sequence: formData.sequence,
          subject: formData.subject.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          state: formData.state,
          priority: formData.priority,
          client_id: formData.client_id || null,
          product_id: formData.product_id || null,
          project_id: formData.project_id || null,
          sprint_id: formData.sprint_id || null,
          assigned_to: formData.assigned_to || null,
          reported_to: formData.reported_to || null,
          manhours_estimate: formData.manhours_estimate,
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

      // Log activity (fire and forget)
      void supabase.from("activity_logs").insert({
        ticket_id: newTicket.id,
        user_id: session?.profile?.id || null,
        action_type: "created",
        message: `Ticket created: ${formData.ticket_id}`,
        created_at: new Date().toISOString(),
      });

      // Redirect to ticket detail
      router.push(`/gawean/${newTicket.id}`);
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      alert(
        `Failed to create ticket: ${err?.message || "Unknown error"}. Please try again.`,
      );
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

              {/* Ticket ID (Read-only) */}
              {formData.ticket_id && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ticket ID
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-mono text-indigo-600 font-semibold">
                      {generatingId ? "Generating..." : formData.ticket_id}
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
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Detailed description, requirements, or notes"
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                <Input
                  label="Estimate (hours)"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.manhours_estimate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      manhours_estimate: parseFloat(e.target.value) || 0,
                    })
                  }
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
              disabled={!formData.ticket_id || generatingId}
            >
              Create Ticket
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
