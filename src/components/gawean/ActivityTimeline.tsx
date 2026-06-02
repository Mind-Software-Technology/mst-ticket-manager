"use client";

// =====================================================
// ActivityTimeline — sidebar log perubahan tiket
// Sprint 2 / Modul Gawean
//
// Format per item:
//   [Avatar] [User Name] · [relative time]
//   • [Description]
// =====================================================

import { useActivityLog } from "@/hooks/useActivityLog";
import { TICKET_STATE_BY_VALUE } from "@/lib/constants";
import { relativeTime } from "@/lib/date-utils";
import type { ActivityLog, TicketState } from "@/types";
import { Activity, History } from "lucide-react";

interface ActivityTimelineProps {
  ticketId: string;
}

export function ActivityTimeline({ ticketId }: ActivityTimelineProps) {
  const { logs, loading, error } = useActivityLog(ticketId);

  return (
    <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <History className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-800 text-sm">Aktivitas</h3>
        {!loading && logs.length > 0 && (
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            {logs.length}
          </span>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-xs text-slate-500">Memuat aktivitas...</p>
        ) : error ? (
          <p className="text-xs text-red-600">Gagal memuat: {error}</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Belum ada aktivitas</p>
          </div>
        ) : (
          <ol className="space-y-4">
            {logs.map((log) => (
              <ActivityItem key={log.id} log={log} />
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

// ─── Item ────────────────────────────────────────────

function ActivityItem({ log }: { log: ActivityLog }) {
  const userName = log.user?.name ?? "Sistem";
  const initial = userName[0]?.toUpperCase() ?? "?";
  const description = describeLog(log);

  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-900">{userName}</span>
          <span className="text-[11px] text-slate-500">
            {relativeTime(log.created_at)}
          </span>
        </div>
        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </li>
  );
}

/**
 * Render-friendly description untuk satu log entry.
 */
function describeLog(log: ActivityLog): React.ReactNode {
  if (log.message) {
    return log.message;
  }

  switch (log.action_type) {
    case "created":
      return "Tiket dibuat";

    case "state_change": {
      const oldLabel = stateLabel(log.old_value);
      const newLabel = stateLabel(log.new_value);
      return (
        <>
          State diubah:{" "}
          <span className="font-medium text-slate-600">{oldLabel}</span> →{" "}
          <span className="font-medium text-emerald-700">{newLabel}</span>
        </>
      );
    }

    case "field_update": {
      const field = log.field_changed ?? "field";
      return (
        <>
          {field} diubah{" "}
          {log.old_value != null && (
            <>
              dari{" "}
              <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">
                {log.old_value}
              </span>{" "}
            </>
          )}
          {log.new_value != null && (
            <>
              menjadi{" "}
              <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1 rounded">
                {log.new_value}
              </span>
            </>
          )}
        </>
      );
    }

    case "comment":
      return log.new_value ?? "Komentar baru";

    case "checkin_ref":
      return "Tiket dilampirkan ke check-in";

    default:
      return `${log.action_type}${log.new_value ? `: ${log.new_value}` : ""}`;
  }
}

function stateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const cfg = TICKET_STATE_BY_VALUE[value as TicketState];
  return cfg?.label ?? value;
}
