// =====================================================
// MST Ticket Manager — UI Configuration Constants
// Sprint 1 / Foundation
//
// Mapping enum DB → label & warna untuk UI.
// Pakai Tailwind 4 utility classes.
// =====================================================

import type {
  CategoryConfig,
  PriorityConfig,
  StateConfig,
  TicketCategory,
  TicketPriority,
  TicketState,
} from "@/types";

// ─── Ticket States (10) ──────────────────────────────

export const TICKET_STATES: StateConfig[] = [
  { value: "backlog",         label: "Backlog",         color: "bg-slate-100",   textColor: "text-slate-700" },
  { value: "todo",            label: "ToDo",            color: "bg-blue-100",    textColor: "text-blue-800" },
  { value: "need_fix",        label: "Need Fix",        color: "bg-amber-100",   textColor: "text-amber-800" },
  { value: "on_progress",     label: "On Progress",     color: "bg-emerald-100", textColor: "text-emerald-800" },
  { value: "code_review",     label: "Code Review",     color: "bg-purple-100",  textColor: "text-purple-800" },
  { value: "ready_for_qa",    label: "Ready For QA",    color: "bg-cyan-100",    textColor: "text-cyan-800" },
  { value: "in_qa",           label: "In QA",           color: "bg-teal-100",    textColor: "text-teal-800" },
  { value: "ready_to_deploy", label: "Ready to Deploy", color: "bg-indigo-100",  textColor: "text-indigo-800" },
  { value: "done",            label: "Done",            color: "bg-green-100",   textColor: "text-green-800" },
  { value: "cancel",          label: "Cancel",          color: "bg-red-100",     textColor: "text-red-800" },
];

export const TICKET_STATE_BY_VALUE: Record<TicketState, StateConfig> =
  TICKET_STATES.reduce((acc, s) => {
    acc[s.value] = s;
    return acc;
  }, {} as Record<TicketState, StateConfig>);

// ─── Ticket Priorities (4) ───────────────────────────

export const TICKET_PRIORITIES: PriorityConfig[] = [
  { value: "critical", label: "1. Kritis (Urgent)",  level: 1, color: "bg-red-100",    textColor: "text-red-700" },
  { value: "high",     label: "2. Tinggi (High)",    level: 2, color: "bg-orange-100", textColor: "text-orange-700" },
  { value: "normal",   label: "3. Normal (Sedang)",  level: 3, color: "bg-indigo-100", textColor: "text-indigo-700" },
  { value: "low",      label: "4. Rendah (Low)",     level: 4, color: "bg-slate-100",  textColor: "text-slate-600" },
];

export const TICKET_PRIORITY_BY_VALUE: Record<TicketPriority, PriorityConfig> =
  TICKET_PRIORITIES.reduce((acc, p) => {
    acc[p.value] = p;
    return acc;
  }, {} as Record<TicketPriority, PriorityConfig>);

// ─── Ticket Categories (8) ───────────────────────────

export const TICKET_CATEGORIES: CategoryConfig[] = [
  { value: "service_support",           label: "Service & Support" },
  { value: "finance_sales",             label: "Finance & Sales" },
  { value: "development",               label: "Development" },
  { value: "infrastructure_operations", label: "Infrastructure & Operations" },
  { value: "qa_testing",                label: "QA & Testing" },
  { value: "coordination_management",   label: "Coordination & Management" },
  { value: "design_ui_ux",              label: "Design (UI/UX)" },
  { value: "internal_learning",         label: "Internal & Learning" },
];

export const TICKET_CATEGORY_BY_VALUE: Record<TicketCategory, CategoryConfig> =
  TICKET_CATEGORIES.reduce((acc, c) => {
    acc[c.value] = c;
    return acc;
  }, {} as Record<TicketCategory, CategoryConfig>);

// ─── State Machine Transitions ───────────────────────
// Source: PRD §5.1.3 (state diagram)
// Catatan: dari `done` & `cancel` dianggap terminal.

export const STATE_TRANSITIONS: Record<TicketState, TicketState[]> = {
  backlog:         ["todo", "cancel"],
  todo:            ["on_progress", "need_fix", "cancel"],
  need_fix:        ["on_progress", "cancel"],
  on_progress:     ["code_review", "cancel"],
  code_review:     ["on_progress", "ready_for_qa"],
  ready_for_qa:    ["in_qa"],
  in_qa:           ["on_progress", "ready_to_deploy"],
  ready_to_deploy: ["done"],
  done:            [],
  cancel:          [],
};

// ─── Pagination defaults ─────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;

// ─── Storage buckets ─────────────────────────────────

export const STORAGE_BUCKET_TICKET_ATTACHMENTS = "ticket-attachments";
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
