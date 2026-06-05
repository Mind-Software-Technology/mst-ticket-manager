// =====================================================
// Ticket ID Generator
// Sprint 3 / Create Ticket
//
// Auto-generate ticket ID dalam format: [PREFIX]-[SEQUENCE]
// Example: ZB-20129, DOB-19999, RZ-12345
// =====================================================

import { supabase } from "@/utils/supabase";

/**
 * Generate ticket ID berdasarkan product prefix.
 * 
 * Logic:
 * 1. Get product.prefix (e.g., "ZB", "DOB", "RZ")
 * 2. Query max(sequence) dari tickets dengan product_id yang sama
 * 3. Increment sequence
 * 4. Return formatted ID: PREFIX-SEQUENCE
 * 
 * @param productId - UUID dari product
 * @returns Object dengan ticketId dan sequence number
 */
export async function generateTicketId(productId: string): Promise<{
  ticketId: string;
  sequence: number;
}> {
  try {
    // 1. Get product prefix
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("prefix")
      .eq("id", productId)
      .single();

    if (productError) throw productError;
    if (!product || !product.prefix) {
      throw new Error("Product not found or missing prefix");
    }

    const prefix = product.prefix.toUpperCase();

    // 2. Get max sequence untuk product ini
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("sequence")
      .eq("product_id", productId)
      .order("sequence", { ascending: false })
      .limit(1);

    if (ticketsError) throw ticketsError;

    // 3. Calculate next sequence
    const maxSequence = tickets && tickets.length > 0 ? tickets[0].sequence : 0;
    const nextSequence = maxSequence + 1;

    // 4. Format ticket ID
    const ticketId = `${prefix}-${nextSequence}`;

    return {
      ticketId,
      sequence: nextSequence,
    };
  } catch (err) {
    console.error("[generateTicketId] error:", err);
    throw err;
  }
}

/**
 * Validate ticket ID format.
 * Format: PREFIX-NUMBER (e.g., ZB-20129)
 */
export function validateTicketIdFormat(ticketId: string): boolean {
  const pattern = /^[A-Z]{2,5}-\d+$/;
  return pattern.test(ticketId);
}
