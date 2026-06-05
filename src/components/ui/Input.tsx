// =====================================================
// Input Component — Form input fields
// Sprint 2 / Component Library
//
// Text input, textarea, dengan label & error state.
// =====================================================

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

interface InputProps
  extends BaseInputProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
}

interface TextareaProps
  extends BaseInputProps,
    TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Input({
  label,
  error,
  helperText,
  required,
  size = "md",
  className = "",
  ...props
}: InputProps) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2.5 text-sm",
    lg: "px-4 py-3 text-base",
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full ${sizeStyles[size]} border ${
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
        } rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  error,
  helperText,
  required,
  className = "",
  rows = 3,
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full px-3 py-2.5 text-sm border ${
          error
            ? "border-red-300 focus:ring-red-500 focus:border-red-500"
            : "border-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
        } rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed resize-y ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
