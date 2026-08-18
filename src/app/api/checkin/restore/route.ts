import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { toISODate } from "@/lib/date-utils";

export async function POST(req: Request) {
  try {
    const { employeeId, missedDate } = await req.json();

    if (!employeeId || !missedDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
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
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Restore streak error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
