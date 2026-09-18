"use client";

// =====================================================
// ActivityTimeline Component — Activity log display
// Sprint 2 / Activity Log
//
// Timeline vertikal untuk menampilkan history perubahan ticket.
// Komentar (action_type = "comment") bisa di-edit inline oleh
// penulisnya sendiri atau admin.
// =====================================================

import { useState } from "react";
import { Clock, GitCommit, MessageSquare, User, Pencil, Check, X } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import type { ActivityLog } from "@/types";
import { Badge, RichTextEditor } from "./ui";
import { TICKET_STATE_BY_VALUE } from "@/lib/constants";
import { createClient } from "@/utils/supabase/client";
import { isEmptyHtml, toEditorHtml } from "@/lib/rich-text";

interface ActivityTimelineProps {
  ticketId: string;
  /** ID profil pengguna yang sedang login — untuk menentukan siapa yang boleh edit. */
  currentUserId?: string | null;
  /** Apakah pengguna adalah admin (admin boleh edit semua komentar). */
  isAdmin?: boolean;
}

export function ActivityTimeline({
  ticketId,
  currentUserId,
  isAdmin = false,
}: ActivityTimelineProps) {
  const { logs, loading, error } = useActivityLogs(ticketId);

  // ID log yang sedang dalam mode edit.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Draft teks saat sedang edit.
  const [editDraft, setEditDraft] = useState("");
  // Sedang menyimpan?
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "state_change":
        return <GitCommit className="w-4 h-4" />;
      case "comment":
        return <MessageSquare className="w-4 h-4" />;
      case "field_update":
        return <Clock className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Deteksi apakah string berisi HTML (mulai dengan tag).
  const isHtml = (str: string) => /^\s*</.test(str);

  // Apakah pengguna ini boleh mengedit log tertentu?
  const canEdit = (log: ActivityLog) =>
    log.action_type === "comment" &&
    (isAdmin || (!!currentUserId && log.user_id === currentUserId));

  // Mulai mode edit untuk log tertentu.
  const startEdit = (log: ActivityLog) => {
    setEditingId(log.id);
    // Konversi pesan lama (plain text / HTML) ke format editor.
    setEditDraft(toEditorHtml(log.message ?? ""));
  };

  // Batalkan edit.
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft("");
  };

  // Simpan hasil edit ke Supabase.
  const saveEdit = async (log: ActivityLog) => {
    if (isEmptyHtml(editDraft) && !log.image_url) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from("activity_logs")
        .update({
          message: isEmptyHtml(editDraft) ? null : editDraft,
        })
        .eq("id", log.id);
      if (updateErr) throw updateErr;

      // Mutasi lokal agar UI langsung update tanpa reload penuh.
      log.message = isEmptyHtml(editDraft) ? null : editDraft;
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      console.error("[ActivityTimeline] save edit error:", err);
      alert("Gagal menyimpan perubahan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const renderActivityMessage = (log: ActivityLog) => {
    if (log.action_type === "state_change") {
      const oldState = log.old_value
        ? TICKET_STATE_BY_VALUE[log.old_value as keyof typeof TICKET_STATE_BY_VALUE]
        : null;
      const newState = log.new_value
        ? TICKET_STATE_BY_VALUE[log.new_value as keyof typeof TICKET_STATE_BY_VALUE]
        : null;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {oldState && <Badge variant="state" state={oldState.value} />}
          <span className="text-slate-400">→</span>
          {newState && <Badge variant="state" state={newState.value} />}
          <span className="text-xs text-slate-400">(State)</span>
        </div>
      );
    }

    if (log.action_type === "field_update") {
      return (
        <div className="text-slate-600">
          updated{" "}
          <span className="font-medium text-slate-900">{log.field_changed}</span>
          {log.old_value && log.new_value && (
            <>
              {" from "}
              <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
                {log.old_value}
              </span>
              {" to "}
              <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
                {log.new_value}
              </span>
            </>
          )}
        </div>
      );
    }

    if (log.message || log.image_url) {
      return (
        <div className="space-y-2">
          {log.message && (
            isHtml(log.message) ? (
              // Pesan rich text (HTML dari TipTap) — render dengan styling prose.
              <div
                className="tiptap-content tiptap-readonly text-slate-600"
                dangerouslySetInnerHTML={{ __html: log.message }}
              />
            ) : (
              // Pesan lama (plain text) — tampilkan apa adanya.
              <div className="text-slate-600 whitespace-pre-wrap">{log.message}</div>
            )
          )}
          {log.image_url && (
            <a href={log.image_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={log.image_url}
                alt="Lampiran"
                className="max-h-48 rounded-lg border border-slate-200 object-cover"
              />
            </a>
          )}
        </div>
      );
    }

    return <div className="text-slate-400 italic">No description</div>;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 text-sm">
        Error loading activity: {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {logs.map((log, idx) => {
        const isEditing = editingId === log.id;

        return (
          <div key={log.id} className="flex gap-3 group">
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                {getActivityIcon(log.action_type)}
              </div>
              {idx < logs.length - 1 && (
                <div className="w-0.5 h-full bg-slate-200 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              {/* Header: nama + waktu + tombol edit */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-900">
                  {log.user?.name || "System"}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(log.created_at)}
                </span>
                {/* Tombol Edit — muncul saat hover, hanya untuk komentar milik sendiri / admin */}
                {canEdit(log) && !isEditing && (
                  <button
                    type="button"
                    title="Edit pesan"
                    onClick={() => startEdit(log)}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Body: mode tampil atau mode edit */}
              {isEditing ? (
                <div className="space-y-2">
                  <RichTextEditor
                    value={editDraft}
                    onChange={setEditDraft}
                    placeholder="Edit pesan..."
                    minHeightClass="min-h-[100px]"
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={saving}
                      title="Batalkan"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(log)}
                      disabled={saving || (isEmptyHtml(editDraft) && !log.image_url)}
                      title="Simpan"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm">{renderActivityMessage(log)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
