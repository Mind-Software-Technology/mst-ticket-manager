"use client";

// =====================================================
// TicketAttachments — daftar lampiran tiket (image / video)
//
// Semua orang yang melihat tiket bisa download. Admin (canManage)
// bisa menambah & menghapus lampiran langsung dari halaman detail.
// =====================================================

import { useRef, useState } from "react";
import {
  Download,
  Trash2,
  Plus,
  Paperclip,
  ImageIcon,
  Video,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import {
  uploadTicketAttachments,
  deleteTicketAttachment,
  validateAttachment,
  formatFileSize,
} from "@/lib/ticket-attachments";
import { ACCEPTED_ATTACHMENT_TYPES } from "@/lib/constants";
import type { TicketAttachment } from "@/types";

interface Props {
  ticketId: string;
  attachments: TicketAttachment[];
  /** Admin bisa tambah / hapus. Non-admin hanya bisa download. */
  canManage: boolean;
  /** ID user yang upload (untuk kolom uploaded_by). */
  uploadedBy: string | null;
  /** Dipanggil setelah ada perubahan agar parent reload data tiket. */
  onChanged: () => void;
}

function isVideo(att: TicketAttachment): boolean {
  return (att.file_type || "").startsWith("video/");
}
function isImage(att: TicketAttachment): boolean {
  return (att.file_type || "").startsWith("image/");
}

export function TicketAttachments({
  ticketId,
  attachments,
  canManage,
  uploadedBy,
  onChanged,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // Validasi dulu semuanya; batalkan kalau ada yang tidak valid.
    for (const f of files) {
      const err = validateAttachment(f);
      if (err) {
        alert(err);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    try {
      const supabase = createClient();
      await uploadTicketAttachments(supabase, ticketId, files, uploadedBy);
      onChanged();
    } catch (err) {
      console.error("Failed to upload attachment:", err);
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Unknown error";
      alert(`Gagal mengunggah lampiran: ${msg}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (att: TicketAttachment) => {
    if (!confirm(`Hapus lampiran "${att.file_name}"?`)) return;
    setDeletingId(att.id);
    try {
      const supabase = createClient();
      await deleteTicketAttachment(supabase, att);
      onChanged();
    } catch (err) {
      console.error("Failed to delete attachment:", err);
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Unknown error";
      alert(`Gagal menghapus lampiran: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Paperclip className="w-4 h-4 text-slate-400" />
          Attachment
          {attachments.length > 0 && (
            <span className="text-sm font-normal text-slate-400">
              ({attachments.length})
            </span>
          )}
        </h2>

        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_ATTACHMENT_TYPES}
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={
                uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )
              }
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Mengunggah..." : "Tambah"}
            </Button>
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400">Belum ada lampiran.</p>
      ) : (
        <ul className="space-y-3">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
            >
              {/* Preview kecil */}
              <div className="shrink-0">
                {isImage(att) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.file_url}
                    alt={att.file_name}
                    className="h-12 w-12 rounded object-cover border border-slate-200"
                  />
                ) : isVideo(att) ? (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-slate-500">
                    <Video className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-slate-500">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Nama & ukuran */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {att.file_name}
                </p>
                <p className="text-xs text-slate-400">
                  {[
                    isVideo(att) ? "Video" : isImage(att) ? "Gambar" : "File",
                    formatFileSize(att.file_size),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {/* Aksi */}
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={att.file_url}
                  download={att.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att)}
                    disabled={deletingId === att.id}
                    title="Hapus"
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === att.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
