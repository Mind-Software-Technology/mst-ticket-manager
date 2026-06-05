// =====================================================
// Select Component — Dropdown select
// Sprint 2 / Component Library
//
// Select dropdown dengan label & error state.
// =====================================================

import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  helperText,
  options,
  className = "",
  required,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3 py-2.5 text-sm border ${
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
        } rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
