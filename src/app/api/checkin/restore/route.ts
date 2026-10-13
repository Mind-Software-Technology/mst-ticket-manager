import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { toISODate } from "@/lib/date-utils";

export async function POST(req: Request) {
  try {
    // ── Auth: wajib login ──
    const session = await createServerClient();
    const {
      data: { user: authUser },
    } = await session.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { employeeId, missedDate } = await req.json();

    if (!employeeId || typeof employeeId !== "string" || !missedDate || typeof missedDate !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Format tanggal harus YYYY-MM-DD dan tidak boleh di masa depan / lebih dari 14 hari lalu
    if (!/^\d{4}-\d{2}-\d{2}$/.test(missedDate) || Number.isNaN(Date.parse(missedDate))) {
      return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 });
    }
    const ageDays = (Date.now() - Date.parse(missedDate)) / 86_400_000;
    if (ageDays < -1 || ageDays > 14) {
      return NextResponse.json({ error: "Tanggal di luar rentang yang diizinkan" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ── Otorisasi: hanya pemilik akun itu sendiri atau admin ──
    const { data: caller } = await supabase
      .from("users")
      .select("id, is_admin")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    if (!caller || (caller.id !== employeeId && !caller.is_admin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Hitung berapa kali user sudah menggunakan "Streak Recovery" bulan ini
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: pastRecoveries, error: fetchError } = await supabase
      .from("checkins")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("yesterday_problem", "[SYSTEM_RECOVERY] Streak Recovery")
      .gte("created_at", startOfMonth.toISOString());

    if (fetchError) {
      console.error("Failed to fetch past recoveries:", fetchError);
      return NextResponse.json({ error: "Gagal memeriksa data pemulihan" }, { status: 500 });
    }

    if (pastRecoveries && pastRecoveries.length >= 5) {
      return NextResponse.json(
        { error: "Batas pemulihan streak (5x) untuk bulan ini sudah habis." },
        { status: 403 }
      );
    }

    // Buat dummy check-in pada missedDate
    // Karena created_at bertipe timestamp with time zone, kita buat di jam 12 siang
    const dummyDate = new Date(missedDate);
    dummyDate.setHours(12, 0, 0, 0);

    const { error: insertError } = await supabase.from("checkins").insert({
      employee_id: employeeId,
      yesterday_problem: "[SYSTEM_RECOVERY] Streak Recovery",
      status: "approved",
      created_at: dummyDate.toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to insert recovery checkin:", insertError);
      return NextResponse.json({ error: "Gagal menyimpan pemulihan streak" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Restore streak error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
