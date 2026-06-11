"use client";

// =====================================================
// RichTextEditor — TipTap based WYSIWYG
// Sprint / Gawean Module
//
// Dipakai untuk field Description tiket (create, detail, admin).
// Output berupa HTML, disimpan apa adanya ke kolom `description`.
// =====================================================

import { useEffect, useRef } from "react";
import {
  useEditor,
  EditorContent,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { toEditorHtml } from "@/lib/rich-text";

interface RichTextEditorProps {
  /** Nilai HTML (atau plain text lama) yang ditampilkan. */
  value: string;
  /** Dipanggil setiap konten berubah, dengan HTML terbaru. */
  onChange?: (html: string) => void;
  /** Dipanggil saat editor kehilangan fokus, dengan HTML terbaru. */
  onBlur?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  /** Tailwind class untuk tinggi minimum area edit. */
  minHeightClass?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  editable = true,
  placeholder = "Tulis sesuatu...",
  minHeightClass = "min-h-[180px]",
}: RichTextEditorProps) {
  // Ref agar callback terbaru selalu dipakai (hindari stale closure).
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  const editor = useEditor({
    immediatelyRender: false, // hindari hydration mismatch di Next SSR
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: `tiptap-content ${minHeightClass} w-full px-3 py-2 focus:outline-none`,
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current?.(editor.getHTML()),
    onBlur: ({ editor }) => onBlurRef.current?.(editor.getHTML()),
  });

  // Sinkron bila value berubah dari luar (mis. data tiket selesai dimuat).
  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value);
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  // Sinkron status editable.
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    // Placeholder sebelum editor siap (SSR / first paint) — cegah layout shift.
    return (
      <div
        className={`w-full rounded-lg border border-slate-300 bg-white ${minHeightClass}`}
      />
    );
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  // Subscribe ke state editor agar tombol aktif ter-update saat seleksi berubah.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isH2: editor.isActive("heading", { level: 2 }),
      isH3: editor.isActive("heading", { level: 3 }),
      isBullet: editor.isActive("bulletList"),
      isOrdered: editor.isActive("orderedList"),
      isLink: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Masukkan URL tautan:", prev ?? "https://");
    if (url === null) return; // batal
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading"
        active={state.isH2}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Sub-heading"
        active={state.isH3}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet List"
        active={state.isBullet}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered List"
        active={state.isOrdered}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Link" active={state.isLink} onClick={setLink}>
        <Link2 className="w-4 h-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // onMouseDown preventDefault agar fokus editor tidak hilang saat klik.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-indigo-600 text-white"
          : "text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden="true" />;
}
