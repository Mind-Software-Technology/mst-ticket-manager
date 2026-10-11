// =====================================================
// API Route: Manual Weekend Reminder (WhatsApp via Fonnte)
//
// Dipanggil dari tombol "Kirim Pengingat Akhir Pekan" di UI admin,
// untuk kirim WA pengingat akhir pekan ke semua user aktif
// (atau satu user tertentu) kapan saja, tanpa tunggu cron.
//
// POST tanpa body → kirim ke SEMUA user aktif yang punya WA.
// POST dengan { user_id } → kirim ke user tertentu saja.
//
// Hanya bisa dipanggil oleh user yang sudah login DAN admin.
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWhatsAppMessage, formatWeekendReminder } from "@/lib/fonnte";

// Nama hari otomatis dari tanggal saat ini (WIB)
function getWibDayName(): string {
  const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dow = wibNow.getUTCDay();
  const names: Record<number, string> = {
    0: "Minggu",
    1: "Senin",
    2: "Selasa",
    3: "Rabu",
    4: "Kamis",
    5: "Jumat",
    6: "Sabtu",
  };
  return names[dow] ?? "Hari Ini";
}

/**
 * POST /api/weekend-reminder/send
 * Body (opsional): { user_id?: string }
 *
 * - Tanpa user_id → kirim ke semua user aktif yang punya WA.
 * - Dengan user_id → kirim ke user tersebut saja.
 */
export async function POST(request: Request) {
  // ── 1. Pastikan pemanggil sudah login ──────────────
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Hanya admin yang boleh ──────────────────────
  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("users")
    .select("is_admin")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!caller?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. Parse body (opsional) ───────────────────────
  let userId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    userId = body?.user_id;
  } catch {
    // body kosong — kirim ke semua
  }

  const dayName = getWibDayName();

  // ── 4a. Kirim ke satu user tertentu ──────────────
  if (userId && typeof userId === "string") {
    const { data: targetUser, error: userError } = await admin
      .from("users")
      .select("id, name, whatsapp_number")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({ error: "Gagal mengambil data user" }, { status: 500 });
    }
    if (!targetUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    if (!targetUser.whatsapp_number) {
      return NextResponse.json(
        { error: "User ini belum punya nomor WhatsApp terdaftar" },
        { status: 400 }
      );
    }

    try {
      const result = await sendWhatsAppMessage(
        targetUser.whatsapp_number,
        formatWeekendReminder(targetUser.name, dayName)
      );

      if (!result.ok) {
        return NextResponse.json(
          { error: `Gagal mengirim WA: ${result.detail || "Unknown error"}` },
          { status: 502 }
        );
      }

      return NextResponse.json({
        message: `Pengingat akhir pekan terkirim ke ${targetUser.name}`,
        day: dayName,
        notified: 1,
      });
    } catch (err) {
      console.error("[weekend-remind] send error:", err);
      return NextResponse.json(
        { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  // ── 4b. Kirim sesuai setting targets (atau semua jika tidak ada filter) ──
  const { data: targetSetting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "weekend_reminder_targets")
    .maybeSingle();

  let targetIds: Set<string> | null = null;
  try {
    const raw: string[] = targetSetting?.value ? JSON.parse(targetSetting.value) : [];
    if (raw.length > 0) targetIds = new Set(raw);
  } catch { /* semua */ }

  let usersQuery = admin
    .from("users")
    .select("id, name, whatsapp_number")
    .eq("is_active", true)
    .not("whatsapp_number", "is", null);

  if (targetIds) {
    usersQuery = usersQuery.in("id", [...targetIds]);
  }

  const { data: users, error: userError } = await usersQuery;

  if (userError) {
    return NextResponse.json({ error: "Gagal mengambil data users" }, { status: 500 });
  }

  if (!users || users.length === 0) {
    return NextResponse.json({
      message: "Tidak ada user aktif dengan nomor WA",
      notified: 0,
    });
  }

  let notified = 0;
  let errors = 0;
  const failedUsers: string[] = [];

  for (const user of users) {
    try {
      const result = await sendWhatsAppMessage(
        user.whatsapp_number as string,
        formatWeekendReminder(user.name, dayName)
      );

      if (result.ok) {
        notified++;
      } else {
        console.error(`[weekend-remind] Failed to send to ${user.name}:`, result.detail);
        errors++;
        failedUsers.push(user.name);
      }
    } catch (err) {
      console.error(`[weekend-remind] Error sending to ${user.name}:`, err);
      errors++;
      failedUsers.push(user.name);
    }
  }

  return NextResponse.json({
    message: "Pengingat akhir pekan manual selesai",
    day: dayName,
    total_users: users.length,
    notified,
    errors,
    failed_users: failedUsers.length > 0 ? failedUsers : undefined,
  });
}
