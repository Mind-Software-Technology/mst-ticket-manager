// =====================================================
// Telegram Webhook — Handle /start command
// Sprint 5 / Notification System
//

// Telegram Bot mengirim update ke endpoint ini saat
// user kirim pesan ke bot. Kita handle:
//   /start <link_code> — Link Telegram ke akun MST
//   /start             — Pesan welcome
// =====================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

// ─── Types untuk Telegram Webhook Update ─────────────

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
}

/**
 * POST /api/telegram/webhook
 *
 * Menerima webhook dari Telegram Bot API.
 * Set webhook URL via:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram/webhook
 */
export async function POST(request: Request) {
  // ── Verifikasi request benar-benar dari Telegram ────
  // Telegram mengirim header ini jika webhook didaftarkan dengan secret_token.
  // Lihat: https://core.telegram.org/bots/api#setwebhook (parameter secret_token)
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const incomingSecret = request.headers.get(
      "x-telegram-bot-api-secret-token",
    );
    if (incomingSecret !== expectedSecret) {
      console.warn(
        "[telegram-webhook] Ditolak: secret token tidak valid / tidak ada",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body: TelegramUpdate = await request.json();

    // Hanya proses pesan teks
    if (!body.message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const text = body.message.text.trim();
    const firstName = body.message.from.first_name;

    // ── Handle /start command ────────────────────────
    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const linkCode = parts[1]; // e.g., "LINK-abc123"

      if (linkCode && linkCode.startsWith("LINK-")) {
        // Link Telegram ke akun MST
        await handleLinkAccount(chatId, linkCode, firstName);
      } else {
        // Welcome message
        await sendTelegramMessage(
          chatId,
          [
            `👋 Halo <b>${escapeHtml(firstName)}</b>!`,
            ``,
            `Selamat datang di <b>MST Ticket Manager Bot</b>.`,
            ``,
            `Bot ini akan mengirimkan notifikasi reminder saat sprint mendekati deadline.`,
            ``,
            `Untuk menghubungkan akun Telegram kamu:`,
            `1. Buka MST Ticket Manager → Config → Users`,
            `2. Klik tombol <b>"Link Telegram"</b>`,
            `3. Kirim kode yang diberikan ke bot ini`,
            ``,
            `Contoh: <code>/start LINK-abc123</code>`,
          ].join("\n")
        );
      }
    }

    // ── Handle /status command ───────────────────────
    else if (text === "/status") {
      await handleStatus(chatId);
    }

    // ── Handle /help command ─────────────────────────
    else if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        [
          `📖 <b>Bantuan MST Bot</b>`,
          ``,
          `<b>Perintah yang tersedia:</b>`,
          ``,
          `/start — Pesan selamat datang`,
          `/start LINK-xxx — Hubungkan akun Telegram`,
          `/status — Cek status koneksi akun`,
          `/help — Tampilkan bantuan ini`,
        ].join("\n")
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook] Error:", err);
    // Tetap return 200 agar Telegram tidak retry terus
    return NextResponse.json({ ok: true });
  }
}

// ─── Handlers ────────────────────────────────────────

/**
 * Handle linking Telegram account ke user MST.
 * Link code format: "LINK-<user_id_prefix>"
 * Kita simpan chat_id ke user yang matching.
 */
async function handleLinkAccount(
  chatId: number,
  linkCode: string,
  firstName: string
) {
  const supabase = createAdminClient();

  // Cari user dengan link code yang PERSIS cocok (bukan prefix UUID).
  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, telegram_link_expires_at")
    .eq("telegram_link_code", linkCode)
    .maybeSingle();

  if (error || !user) {
    await sendTelegramMessage(
      chatId,
      `❌ Kode link tidak valid atau sudah dipakai.\n\nBuka MST Ticket Manager → Config → Users untuk membuat kode baru.`
    );
    return;
  }

  // Kode sekali-pakai & berlaku terbatas — tolak kalau sudah kedaluwarsa.
  const expiresAt = user.telegram_link_expires_at
    ? new Date(user.telegram_link_expires_at)
    : null;
  if (!expiresAt || expiresAt.getTime() < Date.now()) {
    await sendTelegramMessage(
      chatId,
      `⌛ Kode link sudah kedaluwarsa.\n\nBuka MST Ticket Manager → Config → Users untuk membuat kode baru.`
    );
    return;
  }

  // Set chat_id + hapus kode (single-use).
  const { error: updateError } = await supabase
    .from("users")
    .update({
      telegram_chat_id: chatId,
      telegram_link_code: null,
      telegram_link_expires_at: null,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[telegram-webhook] Update error:", updateError);
    await sendTelegramMessage(
      chatId,
      `❌ Gagal menghubungkan akun. Silakan coba lagi nanti.`
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    [
      `✅ <b>Berhasil!</b>`,
      ``,
      `Akun Telegram <b>${escapeHtml(firstName)}</b> berhasil terhubung dengan akun MST <b>${escapeHtml(user.name)}</b>.`,
      ``,
      `Kamu akan menerima notifikasi reminder saat sprint mendekati deadline. 🔔`,
    ].join("\n")
  );
}

/**
 * Cek apakah Telegram user sudah terhubung ke akun MST.
 */
async function handleStatus(chatId: number) {
  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("name, role")
    .eq("telegram_chat_id", chatId)
    .limit(1)
    .maybeSingle();

  if (error) {
    await sendTelegramMessage(
      chatId,
      `❌ Gagal mengecek status. Silakan coba lagi nanti.`
    );
    return;
  }

  if (!user) {
    await sendTelegramMessage(
      chatId,
      [
        `⚠️ Akun Telegram kamu <b>belum terhubung</b> dengan MST Ticket Manager.`,
        ``,
        `Untuk menghubungkan:`,
        `1. Buka MST Ticket Manager → Config → Users`,
        `2. Klik tombol <b>"Link Telegram"</b>`,
        `3. Kirim kode yang diberikan ke bot ini`,
      ].join("\n")
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    [
      `✅ <b>Akun terhubung!</b>`,
      ``,
      `👤 Nama: <b>${escapeHtml(user.name)}</b>`,
      `💼 Role: ${escapeHtml(user.role)}`,
      ``,
      `Kamu akan menerima notifikasi otomatis untuk sprint reminder. 🔔`,
    ].join("\n")
  );
}

/**
 * Escape special HTML characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
