// =====================================================
// Rich Text helpers — Ticket Description
//
// Field `description` disimpan sebagai HTML (hasil TipTap).
// Helper di sini menjaga kompatibilitas dengan data lama
// (plain text) dan menyediakan template standar.
// =====================================================

// Template standar untuk deskripsi tiket baru.
// Tiga judul section sebagai paragraf default (bukan heading);
// user mengisi di paragraf kosong di bawahnya dan bebas memformat sendiri.
export const DESCRIPTION_TEMPLATE =
  "<p>What Need to be Done</p><p></p>" +
  "<p>Why It Matters</p><p></p>" +
  "<p>Acceptance Criteria</p><p></p>";

/**
 * Ubah nilai `description` mentah menjadi HTML yang aman dimuat ke editor.
 * - Jika sudah HTML (mengandung tag), dikembalikan apa adanya.
 * - Jika plain text lama, di-escape lalu newline dipertahankan sebagai
 *   paragraf / <br> agar tampilan tidak berubah.
 */
export function toEditorHtml(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Sudah berupa HTML (ada tag elemen)? — biarkan.
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

  // Plain text lama → escape karakter HTML lalu pertahankan baris baru.
  const escaped = escapeHtml(trimmed);

  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Escape karakter HTML dasar pada teks polos. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Regex URL: cocok http(s)://... atau www.... — tanpa tanda baca penutup kalimat.
const URL_PATTERN = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]|\bwww\.[^\s<]+[^\s<.,;:!?)\]'"]/gi;

/**
 * Ubah teks polos (sudah di-escape HTML) menjadi HTML dengan URL
 * otomatis jadi tautan `<a>` yang bisa langsung diklik.
 * Dipakai untuk pesan lama (plain text) yang belum melewati rich text editor.
 */
export function linkifyText(text: string): string {
  return text.replace(URL_PATTERN, (match) => {
    const href = match.startsWith("http") ? match : `https://${match}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${match}</a>`;
  });
}

/** Ubah HTML jadi teks polos ringkas (untuk excerpt notifikasi, dsb). */
export function htmlToPlainText(html: string | null | undefined, maxLen = 140): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * True jika HTML editor tidak punya konten teks/visual berarti
 * (mis. "<p></p>"). Dipakai untuk menyimpan `null` ketika kosong.
 */
export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0;
}
