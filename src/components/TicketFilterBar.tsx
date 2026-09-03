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
import { Filter, X, Check, ChevronRight } from "lucide-react";
import { Button, SearchInput } from "@/components/ui";
import { TicketGroupByMenu } from "@/components/TicketGroupByMenu";
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
  /** Key field "Group By" aktif (null = tidak mengelompok). */
  groupBy?: string | null;
  /** Ubah field "Group By". Kalau tidak diberikan, tombol disembunyikan. */
  onGroupByChange?: (key: string | null) => void;
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

/** Baris pilihan filter dengan checkmark (gaya menu Group By). */
function FilterRow({
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
      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
    >
      <span className="flex w-4 justify-center text-indigo-600">
        {active && <Check className="w-3.5 h-3.5" />}
      </span>
      {children}
    </button>
  );
}

// ─── Komponen utama ──────────────────────────────────

export function TicketFilterBar({
  filters,
  onChange,
  onClearAll,
  groupBy = null,
  onGroupByChange,
}: TicketFilterBarProps) {
  const [open, setOpen] = useState(false);
  // "Add Custom Filter": expander + field yang sedang dipilih.
  const [showCustom, setShowCustom] = useState(false);
  const [customField, setCustomField] = useState("");
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
  if (filters.report_to_me)
    chips.push({ key: "report_me", label: "Report To Me", onRemove: () => onChange({ report_to_me: false }) });
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

          <Button
            variant={filters.report_to_me ? "primary" : "secondary"}
            size="md"
            onClick={() => onChange({ report_to_me: !filters.report_to_me, reported_to: undefined })}
          >
            Report To Me
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

            {/* Dropdown panel — menu ringkas (gaya Group By) */}
            {open && (
              <div className="absolute right-0 z-20 mt-2 w-72 max-h-[75vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg p-1.5">
                {/* Pilihan cepat (checkmark) */}
                <FilterRow
                  active={!!filters.not_closed}
                  onClick={() => onChange({ not_closed: !filters.not_closed })}
                >
                  Not Close
                </FilterRow>
                <FilterRow
                  active={!!filters.overdue}
                  onClick={() => onChange({ overdue: !filters.overdue })}
                >
                  Overdue
                </FilterRow>
                <FilterRow
                  active={(filters.state ?? []).includes("backlog")}
                  onClick={() => onChange({ state: toggleInArray(filters.state, "backlog") })}
                >
                  Backlog
                </FilterRow>
                <FilterRow
                  active={(filters.state ?? []).includes("done")}
                  onClick={() => onChange({ state: toggleInArray(filters.state, "done") })}
                >
                  Done
                </FilterRow>

                {/* Add Custom Filter */}
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => setShowCustom((s) => !s)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>Add Custom Filter</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      showCustom ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {showCustom && (
                  <div className="px-2.5 pb-2 pt-1 space-y-2">
                    <select
                      value={customField}
                      onChange={(e) => setCustomField(e.target.value)}
                      className={dateInputCls}
                    >
                      <option value="">— Pilih filter —</option>
                      <option value="status">Status</option>
                      <option value="priority">Priority</option>
                      <option value="category">Category</option>
                      <option value="due">Due Date</option>
                      <option value="done">Done Date</option>
                      <option value="created">Created</option>
                      <option value="assignee">Assignee (contains)</option>
                      <option value="reporter">Reporter (contains)</option>
                    </select>

                    {customField === "status" && (
                      <div className="space-y-0.5">
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
                    )}

                    {customField === "priority" && (
                      <div className="space-y-0.5">
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
                    )}

                    {customField === "category" && (
                      <div className="space-y-0.5">
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
                    )}

                    {customField === "due" && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {DUE_PRESETS.map((d) => (
                            <Pill
                              key={d.value}
                              active={filters.due_preset === d.value}
                              onClick={() => applyDuePreset(d.value)}
                            >
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
                    )}

                    {customField === "done" && (
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
                    )}

                    {customField === "created" && (
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
                    )}

                    {customField === "assignee" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={assigneeInput}
                          onChange={(e) => setAssigneeInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && applyCustom()}
                          placeholder="Assignee contains…"
                          className={dateInputCls}
                        />
                        <Button variant="primary" size="sm" onClick={applyCustom} className="w-full">
                          Apply
                        </Button>
                      </div>
                    )}

                    {customField === "reporter" && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={reporterInput}
                          onChange={(e) => setReporterInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && applyCustom()}
                          placeholder="Reporter contains…"
                          className={dateInputCls}
                        />
                        <Button variant="primary" size="sm" onClick={applyCustom} className="w-full">
                          Apply
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="my-1 border-t border-slate-100" />
                <div className="flex items-center justify-between px-1">
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

          {/* Group By — di sebelah Filters */}
          {onGroupByChange && (
            <TicketGroupByMenu groupBy={groupBy} onChange={onGroupByChange} />
          )}
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
