"use client";

// =====================================================
// SearchInput — input dengan debounce
// =====================================================

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Debounce milliseconds. Default 300. */
  debounce?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  debounce = 300,
  className = "",
}: SearchInputProps) {
  const [local, setLocal] = useState(value);

  // Sync external value → local saat parent reset filter
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce local → onChange
  useEffect(() => {
    if (local === value) return;
    const timer = setTimeout(() => onChange(local), debounce);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, debounce]);

  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          aria-label="Bersihkan pencarian"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
