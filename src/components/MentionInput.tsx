"use client";

// =====================================================
// MentionInput — input teks dengan autocomplete "@nama".
//
// Teks disimpan apa adanya ("review tolong @Budi "); user yang
// di-tag diekstrak lewat findMentionedUserIds() saat simpan.
// =====================================================

import { useRef, useState } from "react";
import { Input } from "@/components/ui";

export interface TaggableUser {
  id: string;
  name: string;
}

/** Cari ID user yang disebut sebagai "@nama" di dalam teks. */
export function findMentionedUserIds(
  text: string | null | undefined,
  users: TaggableUser[],
): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return users
    .filter((u) => u.name && lower.includes(`@${u.name.toLowerCase()}`))
    .map((u) => u.id);
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  users: TaggableUser[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function MentionInput({ value, onChange, users, placeholder, autoFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const options =
    query === null
      ? []
      : users
          .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6);

  // Deteksi "@kata" tepat sebelum caret.
  const detect = (text: string, caret: number) => {
    const m = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
    setQuery(m ? m[2] : null);
    setActive(0);
  };

  const pick = (user: TaggableUser) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@[^\s@]*$/, `@${user.name} `);
    const after = value.slice(caret);
    onChange(before + after);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (options.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % options.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + options.length) % options.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            pick(options[active]);
          } else if (e.key === "Escape") {
            setQuery(null);
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
      />
      {options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((u, i) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
                className={`block w-full px-3 py-1.5 text-left text-sm text-slate-700 ${
                  i === active ? "bg-indigo-50" : "hover:bg-indigo-50"
                }`}
              >
                @{u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
