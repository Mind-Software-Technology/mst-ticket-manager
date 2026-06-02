// =====================================================
// TicketPriorityBadge — badge berwarna untuk priority
// =====================================================

import { Badge } from "@/components/ui/Badge";
import { TICKET_PRIORITY_BY_VALUE } from "@/lib/constants";
import type { TicketPriority } from "@/types";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  /** Compact = tanpa prefix angka. Default false (tampil "1. Kritis"). */
  compact?: boolean;
}

export function TicketPriorityBadge({ priority, compact = false }: TicketPriorityBadgeProps) {
  const cfg = TICKET_PRIORITY_BY_VALUE[priority];
  if (!cfg) {
    return <Badge>{priority}</Badge>;
  }
  // Strip "1. " prefix kalau compact
  const label = compact ? cfg.label.replace(/^\d+\.\s*/, "") : cfg.label;
  return (
    <Badge bg={cfg.color} text={cfg.textColor}>
      {label}
    </Badge>
  );
}
