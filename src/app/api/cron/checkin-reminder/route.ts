// =====================================================
// Cron Job: Check-In Reminder (WhatsApp via Fonnte)
//
// Dipanggil oleh layanan cron eksternal (cron-job.org) setiap
// beberapa menit sepanjang hari. Endpoint ini sendiri yang
// menentukan apakah sekarang "jam reminder" (dibaca dari
// app_settings.checkin_reminder_hour, diatur admin dari UI)
// dan memakai checkin_reminder_log supaya aman dipanggil
// berkali-kali tanpa kirim WA dobel ke user yang sama di hari
// yang sama.
// =====================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWhatsAppMessage, formatCheckinReminder } from "@/lib/fonnte";
import { wibDayBoundsUtc } from "@/lib/date-utils";
import { parseActiveDays, parseReminderTime, CHECKIN_ACTIVE_DAYS_KEY } from "@/lib/streak";

/**
 * GET /api/cron/checkin-reminder
 *
 * Dilindungi dengan CRON_SECRET header (sama pola dengan sprint-reminder).
 */
export async function GET(request: Request) {
  // ── 1. Verify cron secret ──────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Fail-closed: kalau secret tidak dikonfigurasi, TOLAK (jangan biarkan terbuka).
  if (!cronSecret) {
    console.error("[checkin-reminder] CRON_SECRET belum di-set — menolak request");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // ── 2. Hitung jam & tanggal "sekarang" versi WIB ───
    const now = new Date();
    const { startUtcIso, endUtcIso, todayStr } = wibDayBoundsUtc(now);
    const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const wibHour = wibNow.getUTCHours();
    const wibDow = wibNow.getUTCDay(); // 0=Minggu, 6=Sabtu

    // ── 3. Baca settings admin (jam reminder + hari aktif) ──
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["checkin_reminder_hour", CHECKIN_ACTIVE_DAYS_KEY]);

    const settingMap: Record<string, string> = {};
    for (const s of settings || []) settingMap[s.key] = s.value;

    const reminder = parseReminderTime(settingMap["checkin_reminder_hour"]);
    const reminderMinutes = reminder.hour * 60 + reminder.minute;
    const nowMinutes = wibHour * 60 + wibNow.getUTCMinutes();

    const { days: activeDays } = parseActiveDays(settingMap[CHECKIN_ACTIVE_DAYS_KEY]);

    // Hari ini bukan hari aktif → lewati (tidak perlu reminder)
    if (!activeDays.has(wibDow)) {
      return NextResponse.json({
        message: "Hari ini bukan hari aktif check-in, dilewati",
        wib_dow: wibDow,
        active_days: [...activeDays],
      });
    }

    // Kirim jika sudah lewat jam reminder (hari ini). Dedup via checkin_reminder_log
    // mencegah kirim ulang, dan cron yang terlambat/terlewat tetap terkejar.
    if (nowMinutes < reminderMinutes) {
      return NextResponse.json({
        message: "Belum jam reminder, dilewati",
        wib_time: `${String(wibHour).padStart(2, "0")}:${String(wibNow.getUTCMinutes()).padStart(2, "0")}`,
        reminder_time: `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`,
      });
    }

    // ── 4. User yang sudah check-in hari ini ───────────
    const { data: todaysCheckins, error: checkinError } = await supabase
      .from("checkins")
      .select("employee_id")
      .gte("created_at", startUtcIso)
      .lt("created_at", endUtcIso);

    if (checkinError) {
      console.error("[checkin-reminder] Checkin query error:", checkinError);
      return NextResponse.json(
        { error: "Failed to query checkins", details: checkinError.message },
        { status: 500 }
      );
    }

    const checkedInIds = new Set(
      (todaysCheckins || []).map((c) => c.employee_id as string)
    );

    // ── 5. User aktif dengan nomor WA terdaftar ────────
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, name, whatsapp_number")
      .eq("is_active", true)
      .not("whatsapp_number", "is", null);

    if (userError) {
      console.error("[checkin-reminder] User query error:", userError);
      return NextResponse.json(
        { error: "Failed to query users", details: userError.message },
        { status: 500 }
      );
    }

    const pending = (users || []).filter((u) => !checkedInIds.has(u.id));

    if (pending.length === 0) {
      return NextResponse.json({
        message: "Semua user sudah check-in atau belum punya nomor WA",
        today: todayStr,
        notified: 0,
      });
    }

    // ── 6. Kirim reminder WA (dedup via checkin_reminder_log) ─
    let notified = 0;
    let skipped = 0;
    let errors = 0;
    const failedUsers: string[] = [];

    // Gagal kirim → lepas klaim supaya panggilan cron berikutnya mencoba lagi
    // (kalau tidak, user itu tidak akan diingatkan lagi sampai besok).
    const releaseClaim = async (userId: string) => {
      const { error } = await supabase
        .from("checkin_reminder_log")
        .delete()
        .eq("user_id", userId)
        .eq("reminder_date", todayStr);
      if (error) console.error("[checkin-reminder] Gagal lepas klaim:", error);
    };

    for (const user of pending) {
      // Klaim slot "sudah diingatkan hari ini" dulu — kalau baris sudah ada
      // (dikirim oleh panggilan cron-job.org sebelumnya), lewati tanpa kirim WA lagi.
      const { error: claimError } = await supabase
        .from("checkin_reminder_log")
        .insert({ user_id: user.id, reminder_date: todayStr });

      if (claimError) {
        if (claimError.code === "23505") {
          // unique violation → sudah pernah diingatkan hari ini
          skipped++;
          continue;
        }
        console.error(
          `[checkin-reminder] Gagal klaim log untuk ${user.name}:`,
          claimError
        );
        errors++;
        failedUsers.push(user.name);
        continue;
      }

      const message = formatCheckinReminder(user.name);

      try {
        const result = await sendWhatsAppMessage(
          user.whatsapp_number as string,
          message
        );

        if (result.ok) {
          notified++;
        } else {
          console.error(
            `[checkin-reminder] Failed to send to ${user.name}:`,
            result.detail
          );
          await releaseClaim(user.id);
          errors++;
          failedUsers.push(user.name);
        }
      } catch (err) {
        console.error(`[checkin-reminder] Error sending to ${user.name}:`, err);
        await releaseClaim(user.id);
        errors++;
        failedUsers.push(user.name);
      }
    }

    return NextResponse.json({
      message: "Check-in reminder completed",
      today: todayStr,
      reminder_time: `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`,
      total_pending: pending.length,
      notified,
      skipped_already_sent: skipped,
      errors,
      failed_users: failedUsers.length > 0 ? failedUsers : undefined,
    });
  } catch (err) {
    console.error("[checkin-reminder] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
