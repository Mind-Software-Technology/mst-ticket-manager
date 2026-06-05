"use client";

// =====================================================
// Ticket Detail Page — View & Edit Ticket
// Sprint 2 / Gawean Module
//
// Detail lengkap ticket dengan edit form, state transitions,
// dan activity log sidebar.
// =====================================================

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, Calendar, User, Clock } from "lucide-react";
import { useTicketDetail } from "@/hooks/useTicketDetail";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge, Button, Input, Textarea, Select } from "@/components/ui";
import {
  TICKET_STATES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  STATE_TRANSITIONS,
} from "@/lib/constants";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id as string;

  const { ticket, loading, error, updateTicket } = useTicketDetail(ticketId);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "normal" as any,
    category: "development" as any,
    manhours_estimate: 0,
    actual_manhours: 0,
    need_qa: false,
    due_date: "",
  });

  // Initialize form when ticket loads
  useState(() => {
    if (ticket && !isEditing) {
      setFormData({
        subject: ticket.subject || "",
        description: ticket.description || "",
        priority: ticket.priority,
        category: ticket.category,
        manhours_estimate: ticket.manhours_estimate || 0,
        actual_manhours: ticket.actual_manhours || 0,
        need_qa: ticket.need_qa,
        due_date: ticket.due_date || "",
      });
    }
  });

  const handleEdit = () => {
    if (ticket) {
      setFormData({
        subject: ticket.subject || "",
        description: ticket.description || "",
        priority: ticket.priority,
        category: ticket.category,
        manhours_estimate: ticket.manhours_estimate || 0,
        actual_manhours: ticket.actual_manhours || 0,
        need_qa: ticket.need_qa,
        due_date: ticket.due_date || "",
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!ticket) return;

    setSaving(true);
    try {
      await updateTicket(formData);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update ticket:", err);
      alert("Failed to update ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleStateChange = async (newState: string) => {
    if (!ticket) return;

    // Validate transition
    const allowedStates = STATE_TRANSITIONS[ticket.state];
    if (!allowedStates.includes(newState as any)) {
      alert(`Cannot transition from ${ticket.state} to ${newState}`);
      return;
    }

    setSaving(true);
    try {
      await updateTicket({ state: newState as any });
    } catch (err) {
      console.error("Failed to change state:", err);
      alert("Failed to change state. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Ticket not found"}</p>
          <Button variant="secondary" onClick={() => router.push("/gawean")}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const availableStates = STATE_TRANSITIONS[ticket.state];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-sm font-semibold text-indigo-600">
                  {ticket.ticket_id}
                </span>
                <Badge variant="state" state={ticket.state} />
                <Badge variant="priority" priority={ticket.priority} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {ticket.subject}
              </h1>
            </div>

            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="secondary"
                  icon={<Edit2 className="w-4 h-4" />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    icon={<X className="w-4 h-4" />}
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Save className="w-4 h-4" />}
                    onClick={handleSave}
                    loading={saving}
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Ticket Information
              </h2>

              {isEditing ? (
                <div className="space-y-4">
                  <Input
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                  />

                  <Textarea
                    label="Description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={6}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Priority"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value as any })
                      }
                      options={TICKET_PRIORITIES.map((p) => ({
                        value: p.value,
                        label: p.label,
                      }))}
                    />

                    <Select
                      label="Category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as any })
                      }
                      options={TICKET_CATEGORIES.map((c) => ({
                        value: c.value,
                        label: c.label,
                      }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Estimate (hours)"
                      type="number"
                      value={formData.manhours_estimate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manhours_estimate: parseFloat(e.target.value) || 0,
                        })
                      }
                    />

                    <Input
                      label="Actual (hours)"
                      type="number"
                      value={formData.actual_manhours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          actual_manhours: parseFloat(e.target.value) || 0,
                        })
                      }
                    />

                    <Input
                      label="Due Date"
                      type="date"
                      value={formData.due_date || ""}
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
                    Need QA
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-1">
                      Description
                    </h3>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {ticket.description || "-"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Client</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.client?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Product</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.product?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Project</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.project?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Category</p>
                      <p className="text-sm font-medium text-slate-900">
                        {TICKET_CATEGORIES.find((c) => c.value === ticket.category)
                          ?.label || ticket.category}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Assignee</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.assignee?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Reporter</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.reporter?.name || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Estimate</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.manhours_estimate}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Actual</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.actual_manhours}h
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Due Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(ticket.due_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Done Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatDate(ticket.done_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Need QA</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.need_qa ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Sprint</p>
                      <p className="text-sm font-medium text-slate-900">
                        {ticket.sprint?.name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* State Transitions */}
            {availableStates.length > 0 && !isEditing && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Change State
                </h2>
                <div className="flex flex-wrap gap-2">
                  {availableStates.map((state) => {
                    const stateConfig = TICKET_STATES.find((s) => s.value === state);
                    return (
                      <Button
                        key={state}
                        variant="secondary"
                        size="sm"
                        onClick={() => handleStateChange(state)}
                        disabled={saving}
                      >
                        Move to {stateConfig?.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Activity Log */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-4">
              <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Activity Log</h2>
              </div>
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                <ActivityTimeline ticketId={ticket.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
