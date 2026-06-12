"use client";

// =====================================================
// TicketFilterBar — Toolbar filter gaya Odoo
// Gawean Module
//
// Search + Assign To Me + dropdown "Filters" (quick filter,
// status/prioritas/kategori, rentang tanggal, custom "contains")
// + baris chip filter aktif yang bisa dihapus satu per satu.
// =====================================================

import { useEffect, useRef, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button, SearchInput } from "@/components/ui";
import {
  TICKET_STATES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TICKET_STATE_BY_VALUE,
  TICKET_PRIORITY_BY_VALUE,
  TICKET_CATEGORY_BY_VALUE,
} from "@/lib/constants";
import { getDuePresetRange } from "@/lib/date-utils";
import type { DuePreset, TicketFilters } from "@/types";

interface TicketFilterBarProps {
  filters: TicketFilters;
  /** Merge sebagian filter (page akan reset pagination ke halaman 1). */
  onChange: (patch: Partial<TicketFilters>) => void;
  /** Reset semua filter ke default. */
  onClearAll: () => void;
}

const DUE_PRESETS: { value: DuePreset; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "this_week", label: "Minggu ini" },
  { value: "this_month", label: "Bulan ini" },
  { value: "this_year", label: "Tahun ini" },
];

// ─── Sub-komponen kecil ──────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
      {children}
    </p>
  );
}

// ─── Komponen utama ──────────────────────────────────

export function TicketFilterBar({
  filters,
  onChange,
  onClearAll,
}: TicketFilterBarProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Input lokal untuk custom "contains" (apply via Enter / tombol).
  const [assigneeInput, setAssigneeInput] = useState(filters.assignee_name ?? "");
  const [reporterInput, setReporterInput] = useState(filters.reporter_name ?? "");
  // Sinkronkan draft saat nilai filter berubah dari luar (chip dihapus / Clear All).
  // Pola "adjust state during render" — bukan useEffect — sesuai rekomendasi React.
  const [syncedNames, setSyncedNames] = useState({
    a: filters.assignee_name ?? "",
    r: filters.reporter_name ?? "",
  });
  if (
    syncedNames.a !== (filters.assignee_name ?? "") ||
    syncedNames.r !== (filters.reporter_name ?? "")
  ) {
    setSyncedNames({ a: filters.assignee_name ?? "", r: filters.reporter_name ?? "" });
    setAssigneeInput(filters.assignee_name ?? "");
    setReporterInput(filters.reporter_name ?? "");
  }

  // Tutup dropdown saat klik di luar.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ─── Helpers ───────────────────────────────────────

  const toggleInArray = <T,>(arr: T[] | undefined, val: T): T[] => {
    const a = arr ?? [];
    return a.includes(val) ? a.filter((x) => x !== val) : [...a, val];
  };

  const applyDuePreset = (preset: DuePreset) => {
    if (filters.due_preset === preset) {
      onChange({ due_preset: undefined, due_date_from: undefined, due_date_to: undefined });
    } else {
      const { from, to } = getDuePresetRange(preset);
      onChange({ due_preset: preset, due_date_from: from, due_date_to: to });
    }
  };

  const applyCustom = () => {
    onChange({
      assignee_name: assigneeInput.trim() || undefined,
      reporter_name: reporterInput.trim() || undefined,
    });
  };

  // ─── Chip filter aktif ─────────────────────────────

  type Chip = { key: string; label: string; onRemove: () => void };
  const chips: Chip[] = [];

  if (filters.assign_to_me)
    chips.push({ key: "me", label: "Assign To Me", onRemove: () => onChange({ assign_to_me: false }) });
  if (filters.not_closed)
    chips.push({ key: "notclose", label: "Not Close", onRemove: () => onChange({ not_closed: false }) });
  if (filters.overdue)
    chips.push({ key: "overdue", label: "Overdue", onRemove: () => onChange({ overdue: false }) });

  (filters.state ?? []).forEach((s) =>
    chips.push({
      key: `state-${s}`,
      label: TICKET_STATE_BY_VALUE[s].label,
      onRemove: () => onChange({ state: (filters.state ?? []).filter((x) => x !== s) }),
    }),
  );
  (filters.priority ?? []).forEach((p) =>
    chips.push({
      key: `prio-${p}`,
      label: TICKET_PRIORITY_BY_VALUE[p].label,
      onRemove: () => onChange({ priority: (filters.priority ?? []).filter((x) => x !== p) }),
    }),
  );
  (filters.category ?? []).forEach((c) =>
    chips.push({
      key: `cat-${c}`,
      label: TICKET_CATEGORY_BY_VALUE[c].label,
      onRemove: () => onChange({ category: (filters.category ?? []).filter((x) => x !== c) }),
    }),
  );

  if (filters.assignee_name)
    chips.push({
      key: "assignee",
      label: `Assignee: ${filters.assignee_name}`,
      onRemove: () => onChange({ assignee_name: undefined }),
    });
  if (filters.reporter_name)
    chips.push({
      key: "reporter",
      label: `Reporter: ${filters.reporter_name}`,
      onRemove: () => onChange({ reporter_name: undefined }),
    });

  if (filters.due_preset) {
    const lbl = DUE_PRESETS.find((d) => d.value === filters.due_preset)?.label ?? "";
    chips.push({
      key: "due",
      label: `Due: ${lbl}`,
      onRemove: () => onChange({ due_preset: undefined, due_date_from: undefined, due_date_to: undefined }),
    });
  } else if (filters.due_date_from || filters.due_date_to) {
    chips.push({
      key: "due",
      label: `Due: ${filters.due_date_from ?? "…"} → ${filters.due_date_to ?? "…"}`,
      onRemove: () => onChange({ due_date_from: undefined, due_date_to: undefined }),
    });
  }
  if (filters.done_date_from || filters.done_date_to)
    chips.push({
      key: "done",
      label: `Done: ${filters.done_date_from ?? "…"} → ${filters.done_date_to ?? "…"}`,
      onRemove: () => onChange({ done_date_from: undefined, done_date_to: undefined }),
    });
  if (filters.created_from || filters.created_to)
    chips.push({
      key: "created",
      label: `Created: ${filters.created_from ?? "…"} → ${filters.created_to ?? "…"}`,
      onRemove: () => onChange({ created_from: undefined, created_to: undefined }),
    });

  const dateInputCls =
    "w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  // ─── Render ────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 space-y-3">
      {/* Baris atas: search + tombol */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex-1">
          <SearchInput
            value={filters.search ?? ""}
            onChange={(v) => onChange({ search: v })}
            placeholder="Cari tiket berdasarkan subject..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filters.assign_to_me ? "primary" : "secondary"}
            size="md"
            onClick={() => onChange({ assign_to_me: !filters.assign_to_me, assigned_to: undefined })}
          >
            Assign To Me
          </Button>

          <div className="relative" ref={wrapperRef}>
            <Button
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setOpen((o) => !o)}
            >
              Filters
              {chips.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold">
                  {chips.length}
                </span>
              )}
            </Button>

            {/* Dropdown panel */}
            {open && (
              <div className="absolute right-0 z-20 mt-2 w-[22rem] max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-4 space-y-4">
                {/* Quick filter */}
                <div>
                  <SectionLabel>Cepat</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    <Pill active={!!filters.not_closed} onClick={() => onChange({ not_closed: !filters.not_closed })}>
                      Not Close
                    </Pill>
                    <Pill active={!!filters.overdue} onClick={() => onChange({ overdue: !filters.overdue })}>
                      Overdue
                    </Pill>
                    <Pill
                      active={(filters.state ?? []).includes("backlog")}
                      onClick={() => onChange({ state: toggleInArray(filters.state, "backlog") })}
                    >
                      Backlog
                    </Pill>
                    <Pill
                      active={(filters.state ?? []).includes("done")}
                      onClick={() => onChange({ state: toggleInArray(filters.state, "done") })}
                    >
                      Done
                    </Pill>
                  </div>
                </div>

                {/* Status */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Status</SectionLabel>
                  <div className="grid grid-cols-2 gap-1">
                    {TICKET_STATES.map((s) => (
                      <label
                        key={s.value}
                        className="flex items-center text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={(filters.state ?? []).includes(s.value)}
                          onChange={() => onChange({ state: toggleInArray(filters.state, s.value) })}
                          className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Prioritas */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Prioritas</SectionLabel>
                  <div className="space-y-1">
                    {TICKET_PRIORITIES.map((p) => (
                      <label
                        key={p.value}
                        className="flex items-center text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={(filters.priority ?? []).includes(p.value)}
                          onChange={() => onChange({ priority: toggleInArray(filters.priority, p.value) })}
                          className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Kategori */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Kategori</SectionLabel>
                  <div className="grid grid-cols-2 gap-1">
                    {TICKET_CATEGORIES.map((c) => (
                      <label
                        key={c.value}
                        className="flex items-center text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={(filters.category ?? []).includes(c.value)}
                          onChange={() => onChange({ category: toggleInArray(filters.category, c.value) })}
                          className="mr-2 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Due Date</SectionLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {DUE_PRESETS.map((d) => (
                      <Pill key={d.value} active={filters.due_preset === d.value} onClick={() => applyDuePreset(d.value)}>
                        {d.label}
                      </Pill>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.due_date_from ?? ""}
                      onChange={(e) =>
                        onChange({ due_date_from: e.target.value || undefined, due_preset: undefined })
                      }
                      className={dateInputCls}
                    />
                    <input
                      type="date"
                      value={filters.due_date_to ?? ""}
                      onChange={(e) =>
                        onChange({ due_date_to: e.target.value || undefined, due_preset: undefined })
                      }
                      className={dateInputCls}
                    />
                  </div>
                </div>

                {/* Done date */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Done Date</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.done_date_from ?? ""}
                      onChange={(e) => onChange({ done_date_from: e.target.value || undefined })}
                      className={dateInputCls}
                    />
                    <input
                      type="date"
                      value={filters.done_date_to ?? ""}
                      onChange={(e) => onChange({ done_date_to: e.target.value || undefined })}
                      className={dateInputCls}
                    />
                  </div>
                </div>

                {/* Created date */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Dibuat (Created)</SectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.created_from ?? ""}
                      onChange={(e) => onChange({ created_from: e.target.value || undefined })}
                      className={dateInputCls}
                    />
                    <input
                      type="date"
                      value={filters.created_to ?? ""}
                      onChange={(e) => onChange({ created_to: e.target.value || undefined })}
                      className={dateInputCls}
                    />
                  </div>
                </div>

                {/* Custom contains */}
                <div className="pt-3 border-t border-slate-100">
                  <SectionLabel>Custom Filter (contains)</SectionLabel>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Assignee</label>
                      <input
                        type="text"
                        value={assigneeInput}
                        onChange={(e) => setAssigneeInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyCustom()}
                        placeholder="Assigned to"
                        className={dateInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Reporter</label>
                      <input
                        type="text"
                        value={reporterInput}
                        onChange={(e) => setReporterInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyCustom()}
                        placeholder="Reported to"
                        className={dateInputCls}
                      />
                    </div>
                    <Button variant="primary" size="sm" onClick={applyCustom} className="w-full">
                      Apply
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <Button variant="ghost" size="sm" onClick={onClearAll}>
                    Clear All
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris chip filter aktif */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center justify-center rounded-full hover:bg-indigo-100 p-0.5"
                aria-label={`Hapus filter ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 ml-1"
          >
            Hapus semua
          </button>
        </div>
      )}
    </div>
  );
}
