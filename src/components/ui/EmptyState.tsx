// =====================================================
// EmptyState — placeholder ramah saat data kosong
// =====================================================

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="p-8 md:p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
      {Icon && <Icon className="w-10 h-10 md:w-12 md:h-12 text-slate-300 mx-auto mb-3" />}
      <h3 className="text-base md:text-lg font-medium text-slate-700">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
