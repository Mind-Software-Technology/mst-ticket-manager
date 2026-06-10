// =====================================================
// Ticket ID Generator
// Sprint 3 / Create Ticket
//
// Auto-generate ticket ID dalam format: [PREFIX]-[SEQUENCE]
// Example: ZB-20129, DOB-19999, RZ-12345
// =====================================================

import { createClient } from "@/utils/supabase/client";

/**
 * Alokasikan ticket ID + sequence secara ATOMIK lewat RPC `next_ticket_id`.
 *
 * Penomoran dilakukan di server (counter table + UPSERT di dalam function
 * SECURITY DEFINER), sehingga dua pembuatan tiket paralel untuk product yang
 * sama dijamin mendapat sequence berbeda — tidak ada lagi race condition
 * read-then-write seperti versi lama.
 *
 * PENTING: pemanggilan ini meng-INCREMENT counter, jadi panggil HANYA saat
 * benar-benar membuat tiket (submit), bukan untuk preview.
 *
 * @param productId - UUID dari product
 * @returns Object dengan ticketId dan sequence number
 */
export async function generateTicketId(productId: string): Promise<{
  ticketId: string;
  sequence: number;
}> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("next_ticket_id", {
    p_product_id: productId,
  });

  if (error) {
    console.error("[generateTicketId] RPC error:", error);
    throw error;
  }

  const result = data as { ticketId?: string; sequence?: number } | null;
  if (!result?.ticketId || typeof result.sequence !== "number") {
    throw new Error("Gagal generate ticket ID (respons RPC tidak valid)");
  }

  return { ticketId: result.ticketId, sequence: result.sequence };
}

/**
 * Validate ticket ID format.
 * Format: PREFIX-NUMBER (e.g., ZB-20129)
 */
export function validateTicketIdFormat(ticketId: string): boolean {
  const pattern = /^[A-Z]{2,5}-\d+$/;
  return pattern.test(ticketId);
}
