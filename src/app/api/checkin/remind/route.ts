// =====================================================
// API Route: Manual Check-In Reminder (WhatsApp via Fonnte)
//
// Dipanggil dari tombol "Ingatkan" di halaman config oleh
// admin, untuk kirim reminder WA ke satu user tertentu
// kapan saja (tidak perlu tunggu jadwal cron).
//
// Hanya bisa dipanggil oleh user yang sudah login DAN admin
// (pola sama dengan /api/telegram/link-code).
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendWhatsAppMessage, formatCheckinReminder } from "@/lib/fonnte";

/**
 * POST /api/checkin/remind
 * Body: { user_id: string }
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

  // ── 2. Hanya admin yang boleh kirim reminder manual ─
  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("users")
    .select("is_admin")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!caller?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. Validasi input ──────────────────────────────
  let userId: string | undefined;
  try {
    const body = await request.json();
    userId = body?.user_id;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "user_id wajib diisi" }, { status: 400 });
  }

  // ── 4. Ambil data user target ──────────────────────
  const { data: targetUser, error: userError } = await admin
    .from("users")
    .select("id, name, whatsapp_number")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    console.error("[checkin-remind] user query error:", userError);
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

  // ── 5. Kirim WA ─────────────────────────────────────
  try {
    const result = await sendWhatsAppMessage(
      targetUser.whatsapp_number,
      formatCheckinReminder(targetUser.name)
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: `Gagal mengirim WA: ${result.detail || "Unknown error"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: `Reminder terkirim ke ${targetUser.name}` });
  } catch (err) {
    console.error("[checkin-remind] send error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
