// =====================================================
// TicketStateBadge — badge berwarna untuk state tiket
// =====================================================

import { Badge } from "@/components/ui/Badge";
import { TICKET_STATE_BY_VALUE } from "@/lib/constants";
import type { TicketState } from "@/types";

interface TicketStateBadgeProps {
  state: TicketState;
}

export function TicketStateBadge({ state }: TicketStateBadgeProps) {
  const cfg = TICKET_STATE_BY_VALUE[state];
  if (!cfg) {
    return <Badge>{state}</Badge>;
  }
  return (
    <Badge bg={cfg.color} text={cfg.textColor}>
      {cfg.label}
    </Badge>
  );
}
