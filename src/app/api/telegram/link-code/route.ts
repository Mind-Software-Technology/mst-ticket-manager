// =====================================================
// Telegram Link Code — generate kode aman
// Analysis #3b / Notification System
//
// Menggantikan kode lama `LINK-<8 char UUID>` yang mudah ditebak.
// Membuat kode ACAK, SEKALI-PAKAI, dengan EXPIRY, dan menyimpannya
// ke user. Hanya bisa dipanggil oleh user yang sudah login.
// =====================================================

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// Lama berlaku kode link.
const LINK_CODE_TTL_MS = 15 * 60 * 1000; // 15 menit

/**
 * POST /api/telegram/link-code
 * Body: { user_id: string }
 * Response: { code: string, expiresAt: string }
 */
export async function POST(request: Request) {
  // ── 1. Pastikan pemanggil sudah login ──────────────
  // Tanpa ini, siapa pun bisa men-generate kode link untuk akun mana pun.
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1b. Hanya admin yang boleh kelola tautan Telegram (keputusan 1A) ──
  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("users")
    .select("is_admin")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!caller?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Validasi input ──────────────────────────────
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

  // ── 3. Generate kode acak + expiry ─────────────────
  const code = `LINK-${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString();

  // ── 4. Simpan ke user (admin client → bypass RLS) ──
  const { error } = await admin
    .from("users")
    .update({
      telegram_link_code: code,
      telegram_link_expires_at: expiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("[telegram-link-code] update error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kode link" },
      { status: 500 },
    );
  }

  return NextResponse.json({ code, expiresAt });
}
