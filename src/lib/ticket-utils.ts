// =====================================================
// MST Ticket Manager — Ticket Utilities
// Sprint 1 / Foundation
//
// Helper untuk state machine validation, ticket-id parsing,
// dll. yang dipakai across modul Gawean.
// =====================================================

import { STATE_TRANSITIONS } from "@/lib/constants";
import type { TicketState } from "@/types";

/**
 * Cek apakah transisi dari `from` ke `to` legal.
 * Source of truth: STATE_TRANSITIONS di constants.ts.
 */
export function isValidStateTransition(
  from: TicketState,
  to: TicketState,
): boolean {
  if (from === to) return false;
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Daftar state yang BISA dipilih dari state saat ini.
 * Sertakan state saat ini di paling depan supaya UI dropdown
 * tetap bisa "menampilkan" nilai aktif.
 */
export function nextStates(current: TicketState): TicketState[] {
  return [current, ...(STATE_TRANSITIONS[current] ?? [])];
}

/**
 * Apakah state ini final / tidak bisa diubah lagi.
 */
export function isTerminalState(state: TicketState): boolean {
  return (STATE_TRANSITIONS[state] ?? []).length === 0;
}

/**
 * Parse ticket_id "ZB-20129" menjadi { prefix: "ZB", number: 20129 }.
 * Return null kalau format tidak valid.
 */
export function parseTicketId(
  ticketId: string,
): { prefix: string; number: number } | null {
  const match = ticketId.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], number: parseInt(match[2], 10) };
}

/**
 * Ambil prefix dari ticket_id atau dari nama product (sebagai fallback).
 */
export function extractPrefix(ticketId: string): string | null {
  const parsed = parseTicketId(ticketId);
  return parsed?.prefix ?? null;
}

/**
 * Bikin label tampilan ringkas: "ZB-20129 — Subject (On Progress)"
 */
export function formatTicketSummary(args: {
  ticket_id: string;
  subject: string;
  stateLabel?: string;
}): string {
  const base = `${args.ticket_id} — ${args.subject}`;
  return args.stateLabel ? `${base} [${args.stateLabel}]` : base;
}

/**
 * Helper bikin URL detail ticket.
 */
export function ticketDetailHref(ticket: { id: string }): string {
  return `/gawean/${ticket.id}`;
}
