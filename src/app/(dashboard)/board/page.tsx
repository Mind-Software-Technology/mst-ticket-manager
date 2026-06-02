"use client";

// =====================================================
// Legacy /board → redirect ke /gawean (Tugas Saya)
// Sprint 2 / Modul Gawean
// =====================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LegacyBoardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gawean");
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin mb-2" />
      <p className="text-sm">Mengalihkan ke Gawean...</p>
    </div>
  );
}
