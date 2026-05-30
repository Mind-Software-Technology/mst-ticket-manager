// =====================================================
// MST Ticket Manager — Core Type Definitions
// Sprint 1 / Foundation
//
// Source of truth untuk semua tipe yang dipakai di frontend.
// Mengikuti TRD §3.
// =====================================================

// ─── Enums ───────────────────────────────────────────

export type TicketState =
  | "backlog"
  | "todo"
  | "need_fix"
  | "on_progress"
  | "code_review"
  | "ready_for_qa"
  | "in_qa"
  | "ready_to_deploy"
  | "done"
  | "cancel";

export type TicketPriority = "critical" | "high" | "normal" | "low";

export type TicketCategory =
  | "service_support"
  | "finance_sales"
  | "development"
  | "infrastructure_operations"
  | "qa_testing"
  | "coordination_management"
  | "design_ui_ux"
  | "internal_learning";

export type CheckinStatus = "draft" | "approved";

export type ActivityActionType =
  | "state_change"
  | "field_update"
  | "comment"
  | "checkin_ref"
  | "created";

// ─── Database Models ─────────────────────────────────

/**
 * Profile user di tabel public.users.
 * Catatan: kolom `pin` masih ada untuk backward-compat dengan login lama,
 * tapi sejak Sprint 1 auth dipegang oleh Supabase Auth (auth_user_id).
 */
export interface User {
  id: string;
  name: string;
  email: string | null;
  role: string;
  pin: string;
  division: string | null;
  is_active: boolean;
  is_admin: boolean;
  auth_user_id: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  prefix: string;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  // Relasi (populated via join)
  client?: Client | null;
}

export interface Project {
  id: string;
  name: string;
  product_id: string | null;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  product?: Product | null;
  client?: Client | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface Ticket {
  id: string;
  ticket_id: string;
  sequence: number;
  subject: string;
  description: string | null;
  category: TicketCategory;
  state: TicketState;
  priority: TicketPriority;
  manhours_estimate: number;
  actual_manhours: number;
  need_qa: boolean;
  start_date: string | null;
  due_date: string | null;
  done_date: string | null;
  client_id: string | null;
  product_id: string | null;
  project_id: string | null;
  assigned_to: string | null;
  reported_to: string | null;
  division: string | null;
  sprint_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relasi (populated via join)
  client?: Client | null;
  product?: Product | null;
  project?: Project | null;
  assignee?: User | null;
  reporter?: User | null;
  sprint?: Sprint | null;
  labels?: Label[];
  attachments?: TicketAttachment[];
  activity_logs?: ActivityLog[];
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  ticket_id: string;
  user_id: string | null;
  action_type: ActivityActionType;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  created_at: string;
  user?: User | null;
}

export interface Checkin {
  id: string;
  employee_id: string;
  division: string | null;
  yesterday_problem: string | null;
  status: CheckinStatus;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: User | null;
  approver?: User | null;
  items?: CheckinItem[];
}

export interface CheckinItem {
  id: string;
  checkin_id: string;
  ticket_id: string | null;
  description: string | null;
  sort_order: number;
  ticket?: Ticket | null;
}

// ─── UI Helper Types ─────────────────────────────────

export interface StateConfig {
  value: TicketState;
  label: string;
  /** Tailwind background utility (e.g. `bg-emerald-100`) */
  color: string;
  /** Tailwind text-color utility (e.g. `text-emerald-800`) */
  textColor: string;
}

export interface PriorityConfig {
  value: TicketPriority;
  label: string;
  /** Numeric level 1 (highest) → 4 (lowest), per PRD */
  level: number;
  color: string;
  textColor: string;
}

export interface CategoryConfig {
  value: TicketCategory;
  label: string;
}

// ─── Filter & Pagination ────────────────────────────

export interface TicketFilters {
  search?: string;
  state?: TicketState[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assigned_to?: string;
  client_id?: string;
  product_id?: string;
  project_id?: string;
  sprint_id?: string;
  /** Quick-filter shorthand untuk `assigned_to = current user` */
  assign_to_me?: boolean;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Auth / Session ──────────────────────────────────

/**
 * Session user yang disimpan di context aplikasi setelah login.
 * Gabungan dari Supabase auth.user + profile public.users.
 */
export interface SessionUser {
  authId: string;
  email: string;
  profile: User;
}
