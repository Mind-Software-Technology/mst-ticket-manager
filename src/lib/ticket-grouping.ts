// =====================================================
// Ticket Grouping — definisi field "Group By" (gaya Odoo)
// Gawean Module
//
// Dipakai di halaman list Gawean untuk mengelompokkan tiket
// berdasarkan field tertentu (Sprint, Project, Category, dll).
// Pengelompokan dilakukan di sisi klien atas data yang sudah
// difilter & di-fetch.
// =====================================================

import {
  TICKET_STATE_BY_VALUE,
  TICKET_PRIORITY_BY_VALUE,
  TICKET_CATEGORY_BY_VALUE,
} from "@/lib/constants";
import type { Ticket } from "@/types";

/** Saat grouping aktif, ambil sampai sebanyak ini tiket lalu kelompokkan
 *  di klien. Kalau total melebihi ini, sisanya tidak ikut terkelompok. */
export const GROUP_FETCH_LIMIT = 1000;

// id sentinel untuk tiket tanpa nilai pada field grup.
const NONE = "__none__";

export interface GroupDef {
  key: string;
  label: string;
  /** Ambil id grup (stabil) + label tampil untuk sebuah tiket. */
  get: (t: Ticket) => { id: string; label: string };
}

// Field yang tampil langsung sebagai pilihan cepat (sisanya via
// "Add Custom Group"). Urutan mengikuti gambar contoh tim service.
export const QUICK_GROUP_KEYS = ["manhours", "category", "project", "sprint"];

export const GROUP_DEFS: GroupDef[] = [
  {
    key: "manhours",
    label: "Manhour",
    get: (t) => {
      const v = t.manhours_estimate ?? 0;
      return { id: String(v), label: `${v}h` };
    },
  },
  {
    key: "category",
    label: "Category",
    get: (t) => ({
      id: t.category ?? NONE,
      label: t.category ? TICKET_CATEGORY_BY_VALUE[t.category].label : "None",
    }),
  },
  {
    key: "project",
    label: "Project",
    get: (t) => ({ id: t.project_id ?? NONE, label: t.project?.name ?? "None" }),
  },
  {
    key: "sprint",
    label: "Sprint",
    get: (t) => ({ id: t.sprint_id ?? NONE, label: t.sprint?.name ?? "None" }),
  },
  {
    key: "state",
    label: "State",
    get: (t) => ({
      id: t.state ?? NONE,
      label: t.state ? TICKET_STATE_BY_VALUE[t.state].label : "None",
    }),
  },
  {
    key: "priority",
    label: "Priority",
    get: (t) => ({
      id: t.priority ?? NONE,
      label: t.priority ? TICKET_PRIORITY_BY_VALUE[t.priority].label : "None",
    }),
  },
  {
    key: "assignee",
    label: "Assignee",
    get: (t) => ({ id: t.assigned_to ?? NONE, label: t.assignee?.name ?? "None" }),
  },
  {
    key: "reporter",
    label: "Reported To",
    get: (t) => ({ id: t.reported_to ?? NONE, label: t.reporter?.name ?? "None" }),
  },
  {
    key: "client",
    label: "Client",
    get: (t) => ({ id: t.client_id ?? NONE, label: t.client?.name ?? "None" }),
  },
  {
    key: "product",
    label: "Product",
    get: (t) => ({ id: t.product_id ?? NONE, label: t.product?.name ?? "None" }),
  },
  {
    key: "need_qa",
    label: "Need QA",
    get: (t) => ({ id: t.need_qa ? "yes" : "no", label: t.need_qa ? "Need QA" : "No QA" }),
  },
  {
    key: "division",
    label: "Divisi",
    get: (t) => ({ id: t.division ?? NONE, label: t.division ?? "None" }),
  },
  {
    key: "due_date",
    label: "Due Date",
    get: (t) => ({ id: t.due_date ?? NONE, label: t.due_date ?? "None" }),
  },
  {
    key: "start_date",
    label: "Start Date",
    get: (t) => ({ id: t.start_date ?? NONE, label: t.start_date ?? "None" }),
  },
];

export const GROUP_DEF_BY_KEY: Record<string, GroupDef> = GROUP_DEFS.reduce(
  (acc, def) => {
    acc[def.key] = def;
    return acc;
  },
  {} as Record<string, GroupDef>,
);

export interface TicketGroup {
  id: string;
  label: string;
  tickets: Ticket[];
  /** Total estimasi manhours seluruh tiket dalam grup. */
  manhoursTotal: number;
}

/** Kelompokkan daftar tiket berdasarkan `groupKey`. Grup "None" selalu
 *  di akhir; grup numerik (mis. Manhour) diurutkan menaik secara angka. */
export function groupTickets(tickets: Ticket[], groupKey: string): TicketGroup[] {
  const def = GROUP_DEF_BY_KEY[groupKey];
  if (!def) return [];

  const map = new Map<string, TicketGroup>();
  for (const t of tickets) {
    const { id, label } = def.get(t);
    let g = map.get(id);
    if (!g) {
      g = { id, label, tickets: [], manhoursTotal: 0 };
      map.set(id, g);
    }
    g.tickets.push(t);
    g.manhoursTotal += t.manhours_estimate ?? 0;
  }

  return [...map.values()].sort((a, b) => {
    if (a.id === NONE) return 1;
    if (b.id === NONE) return -1;
    const na = Number(a.id);
    const nb = Number(b.id);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.label.localeCompare(b.label);
  });
}
