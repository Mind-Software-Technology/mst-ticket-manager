// =====================================================
// Cron Job: Weekend Daily Reminder (WhatsApp via Fonnte)
//
// Dipanggil oleh Vercel Cron setiap Sabtu & Minggu jam 20:00 WIB
// (= 13:00 UTC, lihat vercel.json).
//
// Hanya berjalan di hari Sabtu (6) dan Minggu (0).
// Mengirim pesan WA pengingat/sapaan akhir pekan ke semua user
// aktif yang memiliki nomor WhatsApp terdaftar.
//
// Dilindungi dengan CRON_SECRET header (pola sama dengan checkin-reminder).
// Dedup via weekend_reminder_log supaya aman dipanggil berkali-kali
// tanpa kirim WA dobel ke user yang sama di hari yang sama.
// =====================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWhatsAppMessage, formatWeekendReminder } from "@/lib/fonnte";
import { wibDayBoundsUtc } from "@/lib/date-utils";

// Hari akhir pekan: 0 = Minggu, 6 = Sabtu
const WEEKEND_DAYS = new Set([0, 6]);
const DAY_NAMES: Record<number, string> = {
  0: "Minggu",
  6: "Sabtu",
};

/**
 * GET /api/cron/weekend-reminder
 *
 * Dilindungi dengan CRON_SECRET header.
 * Dipanggil Vercel Cron setiap Sabtu & Minggu jam 14:00 UTC (= 21:00 WIB).
 */
export async function GET(request: Request) {
  // ── 1. Verify cron secret ──────────────────────────
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[weekend-reminder] CRON_SECRET belum di-set — menolak request");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Cek apakah hari ini Sabtu / Minggu (WIB) ───
  const now = new Date();
  const { todayStr } = wibDayBoundsUtc(now);
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const wibDow = wibNow.getUTCDay(); // 0=Minggu, 6=Sabtu

  if (!WEEKEND_DAYS.has(wibDow)) {
    return NextResponse.json({
      message: "Hari ini bukan akhir pekan, dilewati",
      wib_dow: wibDow,
      today: todayStr,
    });
  }

  const dayName = DAY_NAMES[wibDow];

  try {
    const supabase = createAdminClient();

    // ── 3. Ambil semua user aktif dengan nomor WA ──
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, name, whatsapp_number")
      .eq("is_active", true)
      .not("whatsapp_number", "is", null);

    if (userError) {
      console.error("[weekend-reminder] User query error:", userError);
      return NextResponse.json(
        { error: "Failed to query users", details: userError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: "Tidak ada user aktif dengan nomor WA",
        today: todayStr,
        notified: 0,
      });
    }

    // ── 4. Kirim WA (dedup via weekend_reminder_log) ─
    let notified = 0;
    let skipped = 0;
    let errors = 0;
    const failedUsers: string[] = [];

    const releaseClaim = async (userId: string) => {
      const { error } = await supabase
        .from("weekend_reminder_log")
        .delete()
        .eq("user_id", userId)
        .eq("reminder_date", todayStr);
      if (error) console.error("[weekend-reminder] Gagal lepas klaim:", error);
    };

    for (const user of users) {
      // Klaim slot "sudah diingatkan hari ini" supaya tidak kirim dobel
      const { error: claimError } = await supabase
        .from("weekend_reminder_log")
        .insert({ user_id: user.id, reminder_date: todayStr });

      if (claimError) {
        if (claimError.code === "23505") {
          // unique violation → sudah pernah diingatkan hari ini
          skipped++;
          continue;
        }
        console.error(
          `[weekend-reminder] Gagal klaim log untuk ${user.name}:`,
          claimError
        );
        errors++;
        failedUsers.push(user.name);
        continue;
      }

      const message = formatWeekendReminder(user.name, dayName);

      try {
        const result = await sendWhatsAppMessage(
          user.whatsapp_number as string,
          message
        );

        if (result.ok) {
          notified++;
        } else {
          console.error(
            `[weekend-reminder] Failed to send to ${user.name}:`,
            result.detail
          );
          await releaseClaim(user.id);
          errors++;
          failedUsers.push(user.name);
        }
      } catch (err) {
        console.error(`[weekend-reminder] Error sending to ${user.name}:`, err);
        await releaseClaim(user.id);
        errors++;
        failedUsers.push(user.name);
      }
    }

    return NextResponse.json({
      message: "Weekend reminder completed",
      day: dayName,
      today: todayStr,
      total_users: users.length,
      notified,
      skipped_already_sent: skipped,
      errors,
      failed_users: failedUsers.length > 0 ? failedUsers : undefined,
    });
  } catch (err) {
    console.error("[weekend-reminder] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
