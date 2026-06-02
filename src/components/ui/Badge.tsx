// =====================================================
// Badge — small colored pill
// Generic untuk state, priority, label, dll.
// =====================================================

import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  /** Tailwind bg utility (e.g. `bg-emerald-100`) */
  bg?: string;
  /** Tailwind text-color utility (e.g. `text-emerald-800`) */
  text?: string;
  className?: string;
}

export function Badge({
  children,
  bg = "bg-slate-100",
  text = "text-slate-700",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text} ${className}`}
    >
      {children}
    </span>
  );
}
