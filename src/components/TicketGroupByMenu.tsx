"use client";

// =====================================================
// TicketGroupByMenu — tombol "Group By" gaya Odoo
// Gawean Module
//
// Tombol + dropdown: pilihan grup cepat (Manhour, Category,
// Project, Sprint) + "Add Custom Group" untuk field lainnya.
// Diletakkan di sebelah tombol "Filters".
// =====================================================

import { useEffect, useRef, useState } from "react";
import { Layers, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import {
  GROUP_DEFS,
  GROUP_DEF_BY_KEY,
  QUICK_GROUP_KEYS,
} from "@/lib/ticket-grouping";

interface TicketGroupByMenuProps {
  /** Key field grup aktif, atau null kalau tidak ada grouping. */
  groupBy: string | null;
  onChange: (key: string | null) => void;
}

export function TicketGroupByMenu({ groupBy, onChange }: TicketGroupByMenuProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Pilih field grup. Klik field yang sedang aktif → matikan grouping.
  const select = (key: string | null) => {
    const next = !key ? null : groupBy === key ? null : key;
    onChange(next);
    setOpen(false);
    setShowCustom(false);
  };

  const activeLabel = groupBy ? GROUP_DEF_BY_KEY[groupBy]?.label : null;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant={groupBy ? "primary" : "secondary"}
        icon={<Layers className="w-4 h-4" />}
        onClick={() => setOpen((o) => !o)}
      >
        Group By
        {activeLabel && (
          <span className="ml-2 inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
            {activeLabel}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5">
          {/* Pilihan cepat */}
          {QUICK_GROUP_KEYS.map((key) => {
            const def = GROUP_DEF_BY_KEY[key];
            if (!def) return null;
            const active = groupBy === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => select(key)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span className="flex w-4 justify-center text-indigo-600">
                  {active && <Check className="w-3.5 h-3.5" />}
                </span>
                {def.label}
              </button>
            );
          })}

          {/* Add Custom Group */}
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => setShowCustom((s) => !s)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span>Add Custom Group</span>
            <ChevronRight
              className={`w-4 h-4 text-slate-400 transition-transform ${
                showCustom ? "rotate-90" : ""
              }`}
            />
          </button>

          {showCustom && (
            <div className="px-2.5 pb-2 pt-1">
              <select
                value={groupBy ?? ""}
                onChange={(e) => select(e.target.value || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Pilih field —</option>
                {GROUP_DEFS.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hapus grup */}
          {groupBy && (
            <>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => select(null)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <span className="flex w-4 justify-center">×</span>
                Hapus Grup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
