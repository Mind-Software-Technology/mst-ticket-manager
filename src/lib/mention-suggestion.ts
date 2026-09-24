// =====================================================
// Mention suggestion config — dropdown "@nama" di RichTextEditor.
// Dipisah dari RichTextEditor.tsx supaya extension Mention bisa
// dikonfigurasi ulang dengan sumber user terbaru lewat ref (tanpa
// perlu re-create editor tiap kali daftar user berubah).
// =====================================================

import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList, type MentionListHandle, type MentionSuggestionItem } from "@/components/ui/MentionList";

/**
 * `getUsers` dipanggil setiap kali suggestion dicari, jadi selalu
 * baca daftar user terbaru (biasanya lewat ref, bukan snapshot lama).
 */
export function createMentionSuggestion(
  getUsers: () => MentionSuggestionItem[],
): Omit<SuggestionOptions<MentionSuggestionItem>, "editor"> {
  return {
    items: ({ query }) => {
      const q = query.trim().toLowerCase();
      const users = getUsers();
      const filtered = q
        ? users.filter((u) => u.name.toLowerCase().includes(q))
        : users;
      return filtered.slice(0, 8);
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle>;
      let popup: TippyInstance[];

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });
          if (!props.clientRect) return;

          popup = tippy("body", {
            getReferenceClientRect: () => props.clientRect!()!,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },
        onUpdate(props) {
          component.updateProps(props);
          if (!props.clientRect || !popup) return;
          popup[0].setProps({ getReferenceClientRect: () => props.clientRect!()! });
        },
        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide();
            return true;
          }
          return component.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
          popup?.[0]?.destroy();
          component.destroy();
        },
      };
    },
  };
}
