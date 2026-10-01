"use client";

// =====================================================
// MemberTagPicker — pilih anggota untuk di-tag (multi-select)
//
// Menampilkan chip anggota terpilih + dropdown pencarian user.
// =====================================================

import { useMemo, useState } from "react";
import { AtSign, X } from "lucide-react";

export interface TaggableUser {
  id: string;
  name: string;
}

interface Props {
  users: TaggableUser[];
  value: string[];
  onChange: (ids: string[]) => void;
}

export function MemberTagPicker({ users, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => value.map((id) => users.find((u) => u.id === id)).filter(Boolean) as TaggableUser[],
    [users, value],
  );

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => !value.includes(u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [users, value, query]);

  const add = (id: string) => {
    onChange([...value, id]);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
        {selected.map((u) => (
          <span
            key={u.id}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-sm text-indigo-700"
          >
            <AtSign className="h-3 w-3" />
            {u.name}
            <button
              type="button"
              onClick={() => onChange(value.filter((id) => id !== u.id))}
              aria-label={`Hapus ${u.name}`}
              className="text-indigo-400 hover:text-indigo-700"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Delay agar klik pada opsi sempat terproses sebelum dropdown tertutup.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={selected.length === 0 ? "Cari & tag anggota..." : ""}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
        />
      </div>

      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(u.id)}
                className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-indigo-50"
              >
                {u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
