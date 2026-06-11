// =====================================================
// Ticket Attachments — upload / delete helpers
//
// Dipakai bersama oleh form create ticket & halaman detail.
// Upload file (image/video) ke storage bucket `ticket-attachments`,
// lalu catat metadata-nya di tabel `ticket_attachments`.
// =====================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORAGE_BUCKET_TICKET_ATTACHMENTS,
  MAX_TICKET_ATTACHMENT_SIZE_BYTES,
} from "@/lib/constants";
import type { TicketAttachment } from "@/types";

/** Hanya gambar atau video yang diperbolehkan. */
export function isAllowedAttachment(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

/** Validasi 1 file; return pesan error (Indonesia) atau null kalau valid. */
export function validateAttachment(file: File): string | null {
  if (!isAllowedAttachment(file)) {
    return `${file.name}: hanya file gambar atau video yang diperbolehkan.`;
  }
  if (file.size > MAX_TICKET_ATTACHMENT_SIZE_BYTES) {
    const limitMb = Math.round(MAX_TICKET_ATTACHMENT_SIZE_BYTES / 1024 / 1024);
    return `${file.name}: ukuran melebihi batas ${limitMb}MB.`;
  }
  return null;
}

/** Format ukuran byte → string ringkas (mis. "2.4 MB"). */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Upload sekumpulan file ke storage + insert ke tabel ticket_attachments.
 * Mengembalikan baris yang berhasil dibuat. Throw pada error pertama.
 */
export async function uploadTicketAttachments(
  supabase: SupabaseClient,
  ticketId: string,
  files: File[],
  uploadedBy: string | null,
): Promise<TicketAttachment[]> {
  const created: TicketAttachment[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const dot = file.name.lastIndexOf(".");
    const ext = dot > -1 ? file.name.slice(dot + 1) : "";
    // Index dipakai supaya nama unik walau beberapa file di milidetik yang sama.
    const path = `${ticketId}/${Date.now()}-${i}${ext ? "." + ext : ""}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_TICKET_ATTACHMENTS)
      .upload(path, file, { contentType: file.type || undefined });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage
      .from(STORAGE_BUCKET_TICKET_ATTACHMENTS)
      .getPublicUrl(path);

    const { data, error: insertErr } = await supabase
      .from("ticket_attachments")
      .insert({
        ticket_id: ticketId,
        file_name: file.name,
        file_url: pub.publicUrl,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    created.push(data as TicketAttachment);
  }

  return created;
}

/** Ekstrak storage path dari public URL (untuk hapus object). */
export function storagePathFromUrl(fileUrl: string): string | null {
  const marker = `/${STORAGE_BUCKET_TICKET_ATTACHMENTS}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return fileUrl.slice(idx + marker.length);
}

/**
 * Hapus 1 attachment: object di storage + baris di ticket_attachments.
 * Object storage di-remove best-effort; kegagalan baris DB di-throw.
 */
export async function deleteTicketAttachment(
  supabase: SupabaseClient,
  attachment: TicketAttachment,
): Promise<void> {
  const path = storagePathFromUrl(attachment.file_url);
  if (path) {
    await supabase.storage
      .from(STORAGE_BUCKET_TICKET_ATTACHMENTS)
      .remove([path]);
  }

  const { error } = await supabase
    .from("ticket_attachments")
    .delete()
    .eq("id", attachment.id);
  if (error) throw error;
}
