// =====================================================
// Fonnte WhatsApp API Helper
// Check-In Reminder / Notification System
//
// Kirim pesan notifikasi WA ke user via Fonnte API.
// Dipakai oleh cron job checkin-reminder & tombol
// "Ingatkan" manual di halaman config.
// =====================================================

const FONNTE_API_URL = "https://api.fonnte.com/send";

/**
 * Kirim pesan teks ke nomor WhatsApp via Fonnte.
 * Format nomor: 628xxxxxxxxxx (awalan 62, tanpa + atau 0 di depan).
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    throw new Error("FONNTE_TOKEN is not set in environment variables");
  }

  const res = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ target: phone, message }),
  });

  const data = await res.json();

  if (!data.status) {
    console.error("[Fonnte] send failed:", data);
  }

  return { ok: Boolean(data.status), detail: data.reason || data.detail };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mst-ticket-manager.vercel.app";

/**
 * Buat pesan reminder check-in belum dikerjakan.
 */
export function formatCheckinReminder(userName: string): string {
  return [
    `Halo *${userName}*,`,
    ``,
    `Kamu belum melakukan *check-in* hari ini di MST Ticket Manager.`,
    `Yuk isi check-in untuk menandai fokus kerja hari ini. 🙏`,
    ``,
    `${APP_URL}/checkin/new`,
  ].join("\n");
}
