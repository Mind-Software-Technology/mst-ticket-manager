// =====================================================
// Cron Job: Sprint Reminder
// Sprint 5 / Notification System
//
// Dipanggil oleh Vercel Cron Jobs setiap hari jam 09:00 WIB.
// Cek sprint yang akan berakhir (H-3, H-1, H-0),
// lalu kirim notifikasi Telegram ke assignee tiket yang
// belum selesai.
// =====================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  sendTelegramMessage,
  formatSprintSummary,
} from "@/lib/telegram";

// Hari-hari sebelum deadline yang akan di-notifikasi
const REMINDER_DAYS = [3, 1, 0];

// States yang dianggap "belum selesai"
const PENDING_STATES = [
  "backlog",
  "todo",
  "need_fix",
  "on_progress",
  "code_review",
  "ready_for_qa",
  "in_qa",
  "ready_to_deploy",
];

/**
 * GET /api/cron/sprint-reminder
 *
 * Vercel Cron akan memanggil endpoint ini setiap hari.
 * Dilindungi dengan CRON_SECRET header.
 */
export async function GET(request: Request) {
  // ── 1. Verify cron secret ──────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail-closed: kalau secret tidak dikonfigurasi, TOLAK (jangan biarkan terbuka).
  if (!cronSecret) {
    console.error("[sprint-reminder] CRON_SECRET belum di-set — menolak request");
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
    const supabase = createAdminClient();

    // ── 2. Hitung tanggal untuk reminder ────────────
    const today = new Date();
    // Reset ke awal hari (UTC+7, tapi kita compare di level date string)
    const todayStr = formatDateStr(today);

    // Cari tanggal end_date yang cocok dengan H-0, H-1, H-3
    const targetDates = REMINDER_DAYS.map((days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return { days, dateStr: formatDateStr(d) };
    });

    // ── 3. Query sprint yang end_date cocok ─────────
    const targetDateStrs = targetDates.map((t) => t.dateStr);

    const { data: sprints, error: sprintError } = await supabase
      .from("sprints")
      .select("*")
      .in("end_date", targetDateStrs)
      .eq("status", "Aktif");

    if (sprintError) {
      console.error("[sprint-reminder] Sprint query error:", sprintError);
      return NextResponse.json(
        { error: "Failed to query sprints", details: sprintError.message },
        { status: 500 }
      );
    }

    if (!sprints || sprints.length === 0) {
      return NextResponse.json({
        message: "No active sprints approaching deadline",
        checked_dates: targetDateStrs,
        today: todayStr,
      });
    }

    // ── 4. Untuk setiap sprint, ambil tiket pending ─
    let totalNotifications = 0;
    const results: Array<{
      sprint: string;
      daysLeft: number;
      notified: number;
      errors: number;
    }> = [];

    for (const sprint of sprints) {
      // Hitung daysLeft berdasarkan end_date sprint
      const endDate = new Date(sprint.end_date + "T00:00:00");
      const diffMs = endDate.getTime() - today.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // Query tickets in this sprint yang belum selesai
      const { data: tickets, error: ticketError } = await supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_id,
          subject,
          state,
          assigned_to,
          assignee:users!tickets_assigned_to_fkey(
            id, name, telegram_chat_id
          )
        `
        )
        .eq("sprint_id", sprint.id)
        .in("state", PENDING_STATES);

      if (ticketError) {
        console.error(
          `[sprint-reminder] Ticket query error for sprint ${sprint.name}:`,
          ticketError
        );
        results.push({
          sprint: sprint.name,
          daysLeft,
          notified: 0,
          errors: 1,
        });
        continue;
      }

      if (!tickets || tickets.length === 0) {
        results.push({
          sprint: sprint.name,
          daysLeft,
          notified: 0,
          errors: 0,
        });
        continue;
      }

      // ── 5. Kelompokkan tiket per user ──────────────
      const userTicketsMap = new Map<
        string,
        {
          userName: string;
          chatId: number;
          tickets: Array<{
            ticketId: string;
            subject: string;
            state: string;
          }>;
        }
      >();

      for (const ticket of tickets) {
        // assignee bisa null jika tiket belum di-assign
        const assignee = ticket.assignee as unknown as {
          id: string;
          name: string;
          telegram_chat_id: number | null;
        } | null;

        if (!assignee || !assignee.telegram_chat_id) {
          continue; // Skip jika user tidak punya Telegram
        }

        const key = assignee.id;
        if (!userTicketsMap.has(key)) {
          userTicketsMap.set(key, {
            userName: assignee.name,
            chatId: assignee.telegram_chat_id,
            tickets: [],
          });
        }

        userTicketsMap.get(key)!.tickets.push({
          ticketId: ticket.ticket_id,
          subject: ticket.subject,
          state: ticket.state,
        });
      }

      // ── 6. Kirim notifikasi per user (summary) ────
      let notified = 0;
      let errors = 0;

      for (const [, userData] of userTicketsMap) {
        const message = formatSprintSummary(
          userData.userName,
          sprint.name,
          daysLeft,
          userData.tickets
        );

        try {
          const result = await sendTelegramMessage(
            userData.chatId,
            message
          );

          if (result.ok) {
            notified++;
            totalNotifications++;
          } else {
            console.error(
              `[sprint-reminder] Failed to send to ${userData.userName}:`,
              result.description
            );
            errors++;
          }
        } catch (err) {
          console.error(
            `[sprint-reminder] Error sending to ${userData.userName}:`,
            err
          );
          errors++;
        }
      }

      results.push({
        sprint: sprint.name,
        daysLeft,
        notified,
        errors,
      });
    }

    // ── 7. Return summary ───────────────────────────
    return NextResponse.json({
      message: `Sprint reminder completed`,
      today: todayStr,
      totalNotifications,
      results,
    });
  } catch (err) {
    console.error("[sprint-reminder] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * Format Date ke string YYYY-MM-DD (date saja, tanpa timezone issues).
 */
function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
