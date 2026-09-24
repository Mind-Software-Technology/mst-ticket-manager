// =====================================================
// @mention helpers — parse mention dari HTML komentar &
// simpan notifikasi ke tabel `mention_notifications`.
// =====================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { htmlToPlainText } from "@/lib/rich-text";

const MENTION_TAG_REGEX = /<span[^>]*data-type="mention"[^>]*>/g;
const MENTION_ID_REGEX = /data-id="([^"]+)"/;

/** Ekstrak ID user yang di-mention (`@nama`) dari HTML komentar/progress reply. */
export function extractMentionedUserIds(html: string | null | undefined): string[] {
  if (!html) return [];
  const ids = new Set<string>();
  const matches = html.match(MENTION_TAG_REGEX) ?? [];
  for (const tag of matches) {
    const idMatch = MENTION_ID_REGEX.exec(tag);
    if (idMatch) ids.add(idMatch[1]);
  }
  return Array.from(ids);
}

/**
 * Simpan notifikasi mention untuk user yang di-tag di sebuah komentar.
 * Dipanggil setelah insert/update activity_logs sukses. Kegagalan di sini
 * tidak boleh menggagalkan penyimpanan komentar itu sendiri — hanya di-log.
 */
export async function notifyMentionedUsers(
  supabase: SupabaseClient,
  params: {
    ticketId: string;
    activityLogId: string | null;
    message: string | null | undefined;
    mentionedBy: string | null;
    /** User yang tidak perlu dinotif (biasanya penulis komentar itu sendiri). */
    excludeUserId?: string | null;
    /** Batasi hanya ke ID yang benar-benar ada di daftar user aktif, mencegah data sampah. */
    knownUserIds?: Set<string>;
  },
): Promise<void> {
  const { ticketId, activityLogId, message, mentionedBy, excludeUserId, knownUserIds } = params;
  const mentionedIds = extractMentionedUserIds(message).filter(
    (id) => id !== excludeUserId && (!knownUserIds || knownUserIds.has(id)),
  );
  if (mentionedIds.length === 0) return;

  const excerpt = htmlToPlainText(message);
  const rows = mentionedIds.map((mentionedUserId) => ({
    ticket_id: ticketId,
    activity_log_id: activityLogId,
    mentioned_user_id: mentionedUserId,
    mentioned_by: mentionedBy,
    excerpt,
  }));

  const { error } = await supabase.from("mention_notifications").insert(rows);
  if (error) {
    console.error("[mentions] Failed to insert mention_notifications:", error);
  }
}
