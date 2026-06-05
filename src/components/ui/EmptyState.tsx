// =====================================================
// EmptyState Component — Empty state placeholder
// Sprint 2 / Component Library
//
// Display ketika tidak ada data, dengan icon & optional action.
// =====================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && (
        <Icon className="mx-auto h-12 w-12 text-slate-300 mb-4" />
      )}
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
