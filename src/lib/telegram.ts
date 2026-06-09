// =====================================================
// Telegram Bot API Helper
// Sprint 5 / Notification System
//
// Kirim pesan notifikasi ke user via Telegram Bot API.
// Dipakai oleh cron job sprint-reminder.
// =====================================================

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Kirim pesan teks ke Telegram chat.
 * Menggunakan Telegram Bot API sendMessage.
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2" }
): Promise<{ ok: boolean; description?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set in environment variables");
  }

  const url = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "HTML",
    }),
  });

  const data = await res.json();

  if (!data.ok) {
    console.error("[Telegram] sendMessage failed:", data);
  }

  return data;
}

// ─── Pesan Templates ─────────────────────────────────

/**
 * Format label hari untuk notifikasi.
 */
function formatDaysLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Hari ini adalah <b>hari terakhir</b> sprint.";
  if (daysLeft === 1) return "Sprint akan berakhir <b>besok</b>.";
  return `Sprint akan berakhir dalam <b>${daysLeft} hari</b>.`;
}

/**
 * Format label state tiket ke Bahasa Indonesia.
 */
const STATE_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "ToDo",
  need_fix: "Need Fix",
  on_progress: "On Progress",
  code_review: "Code Review",
  ready_for_qa: "Ready For QA",
  in_qa: "In QA",
  ready_to_deploy: "Ready to Deploy",
  done: "Done",
  cancel: "Cancel",
};

export interface SprintReminderData {
  userName: string;
  ticketId: string;
  ticketSubject: string;
  ticketState: string;
  sprintName: string;
  daysLeft: number;
}

/**
 * Buat pesan notifikasi sprint reminder per tiket.
 * Format: HTML (Telegram parse_mode).
 */
export function formatSprintReminder(data: SprintReminderData): string {
  const stateLabel = STATE_LABELS[data.ticketState] || data.ticketState;
  const daysText = formatDaysLabel(data.daysLeft);
  const urgencyEmoji =
    data.daysLeft === 0 ? "🔴" : data.daysLeft === 1 ? "🟠" : "🟡";

  return [
    `${urgencyEmoji} <b>Sprint Reminder</b>`,
    ``,
    `Halo <b>${escapeHtml(data.userName)}</b>,`,
    ``,
    `📋 Ticket: <code>${escapeHtml(data.ticketId)}</code>`,
    `📝 ${escapeHtml(data.ticketSubject)}`,
    `📊 Status: <b>${stateLabel}</b>`,
    `🏃 Sprint: ${escapeHtml(data.sprintName)}`,
    ``,
    daysText,
    ``,
    `Mohon update progress atau selesaikan task sebelum sprint berakhir. 🙏`,
  ].join("\n");
}

/**
 * Buat pesan rangkuman jika user punya beberapa tiket pending.
 */
export function formatSprintSummary(
  userName: string,
  sprintName: string,
  daysLeft: number,
  tickets: Array<{ ticketId: string; subject: string; state: string }>
): string {
  const daysText = formatDaysLabel(daysLeft);
  const urgencyEmoji =
    daysLeft === 0 ? "🔴" : daysLeft === 1 ? "🟠" : "🟡";

  const ticketLines = tickets
    .map((t) => {
      const stateLabel = STATE_LABELS[t.state] || t.state;
      return `• <code>${escapeHtml(t.ticketId)}</code> — ${escapeHtml(t.subject)} [${stateLabel}]`;
    })
    .join("\n");

  return [
    `${urgencyEmoji} <b>Sprint Reminder</b>`,
    ``,
    `Halo <b>${escapeHtml(userName)}</b>,`,
    ``,
    `🏃 Sprint: <b>${escapeHtml(sprintName)}</b>`,
    daysText,
    ``,
    `📋 Kamu punya <b>${tickets.length} tiket</b> yang belum selesai:`,
    ``,
    ticketLines,
    ``,
    `Mohon update progress atau selesaikan task sebelum sprint berakhir. 🙏`,
  ].join("\n");
}

// ─── Maintenance Templates ───────────────────────────

/**
 * Format pesan notifikasi maintenance DIMULAI.
 * Dikirim ke semua user saat website masuk mode maintenance.
 */
export function formatMaintenanceStart(
  userName: string,
  customMessage?: string
): string {
  const lines = [
    `🔧 <b>Pemberitahuan Maintenance</b>`,
    ``,
    `Halo <b>${escapeHtml(userName)}</b>,`,
    ``,
    `Website <b>MST Ticket Manager</b> sedang dalam proses perbaikan/pembaruan untuk memberikan pengalaman yang lebih baik.`,
  ];

  if (customMessage) {
    lines.push(``);
    lines.push(`⏰ <b>Info:</b> ${escapeHtml(customMessage)}`);
  }

  lines.push(
    ``,
    `Mohon maaf atas ketidaknyamanannya. 🙏`,
    `Kami akan mengirimkan notifikasi saat website kembali aktif.`
  );

  return lines.join("\n");
}

/**
 * Format pesan notifikasi maintenance SELESAI.
 * Dikirim ke semua user saat website kembali aktif.
 */
export function formatMaintenanceEnd(userName: string): string {
  return [
    `✅ <b>Website Kembali Aktif!</b>`,
    ``,
    `Halo <b>${escapeHtml(userName)}</b>,`,
    ``,
    `<b>MST Ticket Manager</b> sudah kembali aktif dan siap digunakan. 🎉`,
    ``,
    `Silakan akses kembali website untuk melanjutkan pekerjaanmu.`,
    `Terima kasih atas kesabarannya! 🙏`,
  ].join("\n");
}

/**
 * Escape special HTML characters untuk Telegram HTML parse mode.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
