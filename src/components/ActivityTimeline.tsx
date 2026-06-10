"use client";

// =====================================================
// ActivityTimeline Component — Activity log display
// Sprint 2 / Activity Log
//
// Timeline vertikal untuk menampilkan history perubahan ticket.
// =====================================================

import { Clock, GitCommit, MessageSquare, User } from "lucide-react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import type { ActivityLog } from "@/types";
import { Badge } from "./ui";
import { TICKET_STATE_BY_VALUE } from "@/lib/constants";

interface ActivityTimelineProps {
  ticketId: string;
}

export function ActivityTimeline({ ticketId }: ActivityTimelineProps) {
  const { logs, loading, error } = useActivityLogs(ticketId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "state_change":
        return <GitCommit className="w-4 h-4" />;
      case "comment":
        return <MessageSquare className="w-4 h-4" />;
      case "field_update":
        return <Clock className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const renderActivityMessage = (log: ActivityLog) => {
    if (log.action_type === "state_change") {
      const oldState = log.old_value ? TICKET_STATE_BY_VALUE[log.old_value as keyof typeof TICKET_STATE_BY_VALUE] : null;
      const newState = log.new_value ? TICKET_STATE_BY_VALUE[log.new_value as keyof typeof TICKET_STATE_BY_VALUE] : null;
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          {oldState && <Badge variant="state" state={oldState.value} />}
          <span className="text-slate-400">→</span>
          {newState && <Badge variant="state" state={newState.value} />}
          <span className="text-xs text-slate-400">(State)</span>
        </div>
      );
    }

    if (log.action_type === "field_update") {
      return (
        <div className="text-slate-600">
          updated <span className="font-medium text-slate-900">{log.field_changed}</span>
          {log.old_value && log.new_value && (
            <>
              {" from "}
              <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
                {log.old_value}
              </span>
              {" to "}
              <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
                {log.new_value}
              </span>
            </>
          )}
        </div>
      );
    }

    if (log.message || log.image_url) {
      return (
        <div className="space-y-2">
          {log.message && <div className="text-slate-600">{log.message}</div>}
          {log.image_url && (
            <a href={log.image_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={log.image_url}
                alt="Lampiran"
                className="max-h-48 rounded-lg border border-slate-200 object-cover"
              />
            </a>
          )}
        </div>
      );
    }

    return <div className="text-slate-400 italic">No description</div>;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500">
        <Clock className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading activity...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600 text-sm">
        Error loading activity: {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {logs.map((log, idx) => (
        <div key={log.id} className="flex gap-3">
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
              {getActivityIcon(log.action_type)}
            </div>
            {idx < logs.length - 1 && (
              <div className="w-0.5 h-full bg-slate-200 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-900">
                {log.user?.name || "System"}
              </span>
              <span className="text-xs text-slate-400">
                {formatDate(log.created_at)}
              </span>
            </div>
            <div className="text-sm">{renderActivityMessage(log)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
