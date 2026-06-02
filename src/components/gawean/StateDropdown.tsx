"use client";

// =====================================================
// StateDropdown — pilih state baru dengan validasi transition
// Sprint 2 / Modul Gawean
//
// Behaviour:
//   - Hanya tampilkan opsi yang valid dari state saat ini
//     (state saat ini selalu di paling atas).
//   - Saat dipilih, panggil onChange dengan validasi.
//   - Auto-write activity log via parent (lebih clean).
//   - Disabled kalau user tidak punya permission.
// =====================================================

import { TICKET_STATES, TICKET_STATE_BY_VALUE } from "@/lib/constants";
import { isTerminalState, nextStates } from "@/lib/ticket-utils";
import type { TicketState } from "@/types";
import { Lock } from "lucide-react";

interface StateDropdownProps {
  value: TicketState;
  /** Apakah user boleh ubah state. Kalau false, dropdown disabled. */
  canEdit: boolean;
  onChange: (next: TicketState) => void | Promise<void>;
  /** Saat sedang submit ke server */
  loading?: boolean;
}

export function StateDropdown({
  value,
  canEdit,
  onChange,
  loading,
}: StateDropdownProps) {
  const current = TICKET_STATE_BY_VALUE[value];
  const allowed = nextStates(value);
  const terminal = isTerminalState(value);

  // Cari config untuk styling dropdown sesuai state aktif
  const bg = current?.color ?? "bg-slate-100";
  const text = current?.textColor ?? "text-slate-700";

  const isDisabled = !canEdit || loading;

  return (
    <div className="inline-flex flex-col items-stretch gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        State
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const next = e.target.value as TicketState;
            if (next === value) return;
            void onChange(next);
          }}
          disabled={isDisabled}
          className={`appearance-none px-3 py-1.5 pr-8 rounded-lg text-sm font-medium border ${bg} ${text} border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDisabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {/* Render hanya state aktif + transisi valid */}
          {TICKET_STATES.filter((s) => allowed.includes(s.value)).map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {!canEdit && (
          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        )}
      </div>
      {terminal && (
        <p className="text-[10px] text-slate-400">State terminal</p>
      )}
      {!canEdit && (
        <p className="text-[10px] text-slate-400">
          Hanya admin & assignee yang boleh mengubah
        </p>
      )}
    </div>
  );
}
