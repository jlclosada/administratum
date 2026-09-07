import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { RichContent } from "@/types";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
    Bold,
    Heading2,
    ImageIcon,
    Italic,
    List,
    ListOrdered,
    Loader2,
    Quote,
} from "lucide-react";
import { useEffect, useState } from "react";

const editorExtensions = [
  StarterKit,
  Image.configure({ inline: false, HTMLAttributes: { class: "rounded-xl" } }),
];

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
        active && "bg-brand-soft text-primary"
      )}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  value: RichContent;
  onChange: (json: RichContent) => void;
  placeholder?: string;
  /** Storage folder for uploaded inline images. */
  uploadFolder?: string;
  className?: string;
}

/**
 * TipTap-based rich text editor. Stores content as TipTap JSON so that
 * rendering (via RichTextRenderer) is constrained to the schema and safe
 * from stored XSS.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe aquí...",
  uploadFolder = "content",
  className,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      ...editorExtensions,
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? "",
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichContent),
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[220px] w-full max-w-none px-4 py-3 text-sm leading-relaxed focus:outline-none",
      },
    },
  });

  async function handleInsertImage(ed: Editor) {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setUploading(true);
      const url = await uploadFile(file, uploadFolder);
      ed.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error("Failed to insert image:", err);
    } finally {
      setUploading(false);
    }
  }

  if (!editor) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-input bg-background/40",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-card/40 px-2 py-1.5">
        <ToolbarButton
          label="Negrita"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Encabezado"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Cita"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Insertar imagen"
          disabled={uploading}
          onClick={() => handleInsertImage(editor)}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Read-only renderer for TipTap JSON content. Re-parsing through the editor
 * schema guarantees only known nodes/marks render, avoiding stored XSS.
 */
export function RichTextRenderer({
  content,
  className,
}: {
  content: RichContent;
  className?: string;
}) {
  const editor = useEditor(
    {
      extensions: editorExtensions,
      content: content ?? "",
      editable: false,
      editorProps: {
        attributes: { class: "prose-editor max-w-none" },
      },
    },
    [content]
  );

  useEffect(() => {
    if (editor) editor.setEditable(false);
  }, [editor]);

  if (!editor) return null;
  if (
    !content ||
    (typeof content === "object" &&
      "content" in content &&
      Array.isArray((content as { content: unknown[] }).content) &&
      (content as { content: unknown[] }).content.length === 0)
  ) {
    return null;
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
