// =====================================================
// Badge Component — Status, Priority, Label badges
// Sprint 2 / Component Library
//
// Reusable badge dengan variants untuk state, priority, custom.
// =====================================================

import type { TicketState, TicketPriority } from "@/types";
import { TICKET_STATE_BY_VALUE, TICKET_PRIORITY_BY_VALUE } from "@/lib/constants";

interface BadgeProps {
  variant?: "state" | "priority" | "custom";
  state?: TicketState;
  priority?: TicketPriority;
  label?: string;
  color?: string;
  textColor?: string;
  className?: string;
}

export function Badge({
  variant = "custom",
  state,
  priority,
  label,
  color,
  textColor,
  className = "",
}: BadgeProps) {
  // State badge
  if (variant === "state" && state) {
    const config = TICKET_STATE_BY_VALUE[state];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.textColor} ${className}`}
      >
        {config.label}
      </span>
    );
  }

  // Priority badge
  if (variant === "priority" && priority) {
    const config = TICKET_PRIORITY_BY_VALUE[priority];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color} ${config.textColor} ${className}`}
      >
        {config.label}
      </span>
    );
  }

  // Custom badge
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color || "bg-slate-100"} ${textColor || "text-slate-700"} ${className}`}
    >
      {label}
    </span>
  );
}
