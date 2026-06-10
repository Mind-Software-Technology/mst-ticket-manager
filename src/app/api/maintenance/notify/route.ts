// =====================================================
// API Route: Maintenance Notification (Telegram Broadcast)
//
// Kirim notifikasi maintenance ke semua user yang sudah
// link Telegram. Mendukung 2 action:
//   - "start" → pemberitahuan maintenance dimulai
//   - "end"   → pemberitahuan website kembali aktif
//
// Dilindungi dengan CRON_SECRET.
// =====================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendTelegramMessage,
  formatMaintenanceStart,
  formatMaintenanceEnd,
} from "@/lib/telegram";

interface NotifyRequest {
  action: "start" | "end";
  message?: string; // pesan custom (opsional, untuk action "start")
}

/**
 * POST /api/maintenance/notify
 *
 * Body: { "action": "start" | "end", "message": "pesan opsional" }
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: Request) {
  // ── 1. Verify secret ──────────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail-closed: kalau secret tidak dikonfigurasi, TOLAK (jangan biarkan terbuka).
  if (!cronSecret) {
    console.error("[maintenance-notify] CRON_SECRET belum di-set — menolak request");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // ── 2. Parse body ─────────────────────────────────
    const body: NotifyRequest = await request.json();

    if (!body.action || !["start", "end"].includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'start' or 'end'." },
        { status: 400 }
      );
    }

    // ── 3. Query semua user yang punya telegram_chat_id ─
    const supabase = createAdminClient();

    const { data: users, error: queryError } = await supabase
      .from("users")
      .select("id, name, telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (queryError) {
      console.error("[maintenance-notify] Query error:", queryError);
      return NextResponse.json(
        { error: "Failed to query users", details: queryError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: "No users with linked Telegram accounts",
        notified: 0,
        total_users: 0,
      });
    }

    // ── 4. Kirim pesan ke setiap user ─────────────────
    let notified = 0;
    let errors = 0;
    const failedUsers: string[] = [];

    for (const user of users) {
      const chatId = user.telegram_chat_id as number;
      const message =
        body.action === "start"
          ? formatMaintenanceStart(user.name, body.message)
          : formatMaintenanceEnd(user.name);

      try {
        const result = await sendTelegramMessage(chatId, message);

        if (result.ok) {
          notified++;
        } else {
          console.error(
            `[maintenance-notify] Failed to send to ${user.name}:`,
            result.description
          );
          errors++;
          failedUsers.push(user.name);
        }
      } catch (err) {
        console.error(
          `[maintenance-notify] Error sending to ${user.name}:`,
          err
        );
        errors++;
        failedUsers.push(user.name);
      }
    }

    // ── 5. Return summary ─────────────────────────────
    return NextResponse.json({
      message: `Maintenance ${body.action} notification sent`,
      action: body.action,
      total_users: users.length,
      notified,
      errors,
      failed_users: failedUsers.length > 0 ? failedUsers : undefined,
    });
  } catch (err) {
    console.error("[maintenance-notify] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
