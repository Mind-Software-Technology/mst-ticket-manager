"use client";

// =====================================================
// MentionList — dropdown suggestion untuk @mention di RichTextEditor
// =====================================================

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface MentionSuggestionItem {
  id: string;
  name: string;
}

interface MentionListProps {
  items: MentionSuggestionItem[];
  /** Callback dari Tiptap Suggestion — attrs harus match node schema Mention (id, label). */
  command: (attrs: { id: string; label: string }) => void;
}

export interface MentionListHandle {
  onKeyDown: (opts: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.name });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-lg px-3 py-2 text-sm text-slate-400">
          Tidak ada user ditemukan
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-lg py-1 max-h-56 min-w-[180px] overflow-y-auto">
        {items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => selectItem(index)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-[10px] font-semibold text-white">
              {item.name.charAt(0).toUpperCase()}
            </span>
            {item.name}
          </button>
        ))}
      </div>
    );
  },
);
MentionList.displayName = "MentionList";
