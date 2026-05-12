import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    addPaintingProcess,
    addPaintingProcessMedia,
    deletePaintingProcess,
    deletePaintingProcessMedia,
    saveImageToAppData,
    searchPaints,
    updatePaintingProcess
} from "@/db";
import type { MiniatureWithDetails, Paint, PaintingProcess } from "@/types";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion } from "framer-motion";
import jsPDF from "jspdf";
import {
    Bold,
    ChevronDown,
    ChevronUp,
    Droplets,
    Edit,
    FileDown,
    ImageIcon,
    Italic,
    List,
    ListOrdered,
    Palette,
    Play,
    Plus,
    Save,
    Search,
    Trash2,
    Type,
    Video,
    X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaintChip } from "./PaintChipExtension";

// Shared TipTap extensions (reused across all editors)
const sharedExtensions = [
  StarterKit,
  PaintChip,
  Placeholder.configure({ placeholder: "Describe este paso del proceso de pintura..." }),
];

interface PaintingProcessEditorProps {
  miniature: MiniatureWithDetails;
  onUpdate: () => Promise<void>;
}

// ─── Paint Search Popup (inline in toolbar) ─────────────

function PaintSearchPopup({
  open: isOpen,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (paint: Paint) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Paint[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await searchPaints(query.trim());
      setResults(res);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogTitle className="sr-only">Buscar pintura</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pintura por nombre, marca o gama..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && query.trim() && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">Sin resultados para "{query}"</p>
          )}
          {!query.trim() && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">Escribe para buscar entre todas las pinturas</p>
          )}
          {results.map((paint) => (
            <button
              key={paint.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent border-b border-border/50 last:border-0"
              onClick={() => {
                onSelect(paint);
                onClose();
              }}
            >
              <div
                className="h-6 w-6 rounded-full border border-border flex-shrink-0 shadow-sm"
                style={{ backgroundColor: paint.hexColor ?? "#888" }}
              />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{paint.name}</span>
                <span className="text-xs text-muted-foreground">{paint.brand} · {paint.range}</span>
              </div>
            </button>
          ))}
        </div>
        {results.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground text-center">
            {results.length} resultado{results.length !== 1 ? "s" : ""}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Toolbar for TipTap editor ───────────────────────────

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [paintSearch, setPaintSearch] = useState(false);

  if (!editor) return null;
  const btn = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

  const insertPaint = (paint: Paint) => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "paintChip",
        attrs: {
          paintId: paint.id,
          paintName: paint.name,
          hexColor: paint.hexColor,
          brand: paint.brand,
          range: paint.range,
        },
      })
      .insertContent(" ")
      .run();
  };

  return (
    <div className="relative flex items-center gap-0.5 border-b border-border px-2 py-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btn(editor.isActive("bold"))}
        title="Negrita"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btn(editor.isActive("italic"))}
        title="Cursiva"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btn(editor.isActive("heading", { level: 3 }))}
        title="Encabezado"
      >
        <Type className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btn(editor.isActive("bulletList"))}
        title="Lista"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btn(editor.isActive("orderedList"))}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={() => setPaintSearch(!paintSearch)}
        className={btn(paintSearch)}
        title="Insertar pintura"
      >
        <Droplets className="h-4 w-4" />
      </button>
      <PaintSearchPopup
        open={paintSearch}
        onClose={() => setPaintSearch(false)}
        onSelect={insertPaint}
      />
    </div>
  );
}

// ─── Single Step Editor ──────────────────────────────────

function StepEditor({
  process,
  stepNumber,
  onSave,
  onDelete,
  onMediaUpload,
  onMediaDelete,
}: {
  process: PaintingProcess;
  stepNumber: number;
  onSave: (id: string, title: string, description: string, colorsUsed: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMediaUpload: (processId: string, mediaType: "image" | "video") => Promise<void>;
  onMediaDelete: (mediaId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(process.title);
  const [colorsUsed, setColorsUsed] = useState(process.colorsUsed);
  const [expanded, setExpanded] = useState(true);
  const [lightboxMedia, setLightboxMedia] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: sharedExtensions,
    content: process.description || "",
    editable: editing,
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px] px-3 py-2",
      },
    },
  });

  const handleStartEdit = () => {
    setEditing(true);
    setTitle(process.title);
    setColorsUsed(process.colorsUsed);
    editor?.setEditable(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const html = editor?.getHTML() ?? "";
      await onSave(process.id, title.trim(), html, colorsUsed.trim());
      setEditing(false);
      editor?.setEditable(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setTitle(process.title);
    setColorsUsed(process.colorsUsed);
    editor?.commands.setContent(process.description || "");
    editor?.setEditable(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="group rounded-xl border border-border bg-card/50 overflow-hidden"
      >
        {/* Step header */}
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => !editing && setExpanded(!expanded)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {stepNumber}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm font-semibold h-8"
                placeholder="Título del paso..."
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4 className="font-semibold text-sm truncate">{process.title}</h4>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(); }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); onDelete(process.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-4 py-3 space-y-3">
                {/* Rich text editor */}
                <div className={`rounded-lg border ${editing ? "border-primary/50" : "border-border"} overflow-hidden`}>
                  {editing && <EditorToolbar editor={editor} />}
                  <EditorContent editor={editor} />
                </div>

                {/* Colors used */}
                {editing ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Colores utilizados (separados por comas)</Label>
                    <Input
                      value={colorsUsed}
                      onChange={(e) => setColorsUsed(e.target.value)}
                      placeholder="Ej: Abaddon Black, Retributor Armour..."
                      className="text-sm h-8"
                    />
                  </div>
                ) : (
                  process.colorsUsed && (
                    <div className="flex flex-wrap gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      {process.colorsUsed.split(",").map((color, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {color.trim()}
                        </span>
                      ))}
                    </div>
                  )
                )}

                {/* Media gallery */}
                {(process.media.length > 0 || editing) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Archivos adjuntos</span>
                      {editing && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onMediaUpload(process.id, "image")}
                          >
                            <ImageIcon className="h-3 w-3 mr-1" /> Imagen
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => onMediaUpload(process.id, "video")}
                          >
                            <Video className="h-3 w-3 mr-1" /> Vídeo
                          </Button>
                        </div>
                      )}
                    </div>
                    {process.media.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {process.media.map((m) => (
                          <div
                            key={m.id}
                            className="group/media relative rounded-lg overflow-hidden border border-border"
                          >
                            {m.mediaType === "image" ? (
                              <img
                                src={convertFileSrc(m.filePath)}
                                alt={m.fileName}
                                className="aspect-square w-full object-cover cursor-pointer"
                                onClick={() => setLightboxMedia(convertFileSrc(m.filePath))}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="aspect-square w-full flex items-center justify-center bg-muted cursor-pointer"
                                onClick={() => setLightboxMedia(convertFileSrc(m.filePath))}
                              >
                                <Play className="h-8 w-8 text-muted-foreground" />
                                <span className="absolute bottom-1 left-1 text-[10px] text-muted-foreground truncate max-w-[90%]">
                                  {m.fileName}
                                </span>
                              </div>
                            )}
                            {editing && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover/media:opacity-100"
                                onClick={() => onMediaDelete(m.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Edit actions */}
                {editing && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={!title.trim() || saving} className="h-8">
                      <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Media lightbox */}
      <Dialog open={!!lightboxMedia} onOpenChange={() => setLightboxMedia(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Vista previa</DialogTitle>
          {lightboxMedia && (
            lightboxMedia.includes(".mp4") || lightboxMedia.includes(".webm") || lightboxMedia.includes(".mov") ? (
              <video src={lightboxMedia} controls className="max-h-[80vh] w-full rounded-xl" />
            ) : (
              <img src={lightboxMedia} alt="Preview" className="max-h-[80vh] w-full rounded-xl object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── New Step Dialog ─────────────────────────────────────

function NewStepDialog({
  open: isOpen,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string, description: string, colorsUsed: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [colorsUsed, setColorsUsed] = useState("");
  const [adding, setAdding] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      PaintChip,
      Placeholder.configure({ placeholder: "Describe este paso..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2",
      },
    },
  });

  const handleAdd = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      const html = editor?.getHTML() ?? "";
      await onAdd(title.trim(), html, colorsUsed.trim());
      setTitle("");
      setColorsUsed("");
      editor?.commands.clearContent();
      onClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Paso de Pintura</DialogTitle>
          <DialogDescription>
            Añade un nuevo paso al proceso de pintura. Podrás agregar imágenes y vídeos después de guardar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título del paso</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Capa base, Lavado, Luces..."
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <EditorToolbar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Colores utilizados (separados por comas)</Label>
            <Input
              value={colorsUsed}
              onChange={(e) => setColorsUsed(e.target.value)}
              placeholder="Ej: Abaddon Black, Retributor Armour, Nuln Oil..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={!title.trim() || adding}>
            <Plus className="h-4 w-4 mr-1" /> Añadir paso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────

export function PaintingProcessEditor({ miniature, onUpdate }: PaintingProcessEditorProps) {
  const [showNewStep, setShowNewStep] = useState(false);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const processes = miniature.paintingProcesses;

  const handleAddStep = async (title: string, description: string, colorsUsed: string) => {
    const nextOrder = processes.length;
    await addPaintingProcess({
      miniatureId: miniature.id,
      stepOrder: nextOrder,
      title,
      description,
      colorsUsed,
    });
    await onUpdate();
  };

  const handleSaveStep = async (id: string, title: string, description: string, colorsUsed: string) => {
    await updatePaintingProcess(id, title, description, colorsUsed);
    await onUpdate();
  };

  const handleDeleteStep = async (id: string) => {
    await deletePaintingProcess(id);
    await onUpdate();
  };

  const handleMediaUpload = async (processId: string, mediaType: "image" | "video") => {
    const extensions =
      mediaType === "image"
        ? ["png", "jpg", "jpeg", "webp", "gif"]
        : ["mp4", "webm", "mov", "avi"];
    const filterName = mediaType === "image" ? "Imágenes" : "Vídeos";

    const file = await open({
      multiple: false,
      filters: [{ name: filterName, extensions }],
    });
    if (!file) return;

    const savedPath = await saveImageToAppData(file, "painting-process");
    const fileName = file.split("/").pop() ?? `file.${extensions[0]}`;
    await addPaintingProcessMedia(processId, savedPath, fileName, 0, mediaType);
    await onUpdate();
  };

  const handleMediaDelete = async (mediaId: string) => {
    await deletePaintingProcessMedia(mediaId);
    await onUpdate();
  };

  const handleExportPDF = useCallback(async () => {
    if (processes.length === 0) return;
    setExporting(true);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // Title
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Guía de Pintura: ${miniature.name}`, margin, y);
      y += 8;

      // Date
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Generado el ${new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}`,
        margin,
        y
      );
      y += 6;

      // Divider
      pdf.setDrawColor(124, 58, 237);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Steps
      for (let i = 0; i < processes.length; i++) {
        const step = processes[i]!;

        checkPageBreak(30);

        // Step number circle
        pdf.setFillColor(124, 58, 237);
        pdf.circle(margin + 4, y - 1.5, 4, "F");
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${i + 1}`, margin + 4, y, { align: "center" });

        // Step title
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        pdf.text(step.title, margin + 12, y);
        y += 8;

        // Description - strip HTML tags and render as text
        if (step.description) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = step.description;
          const plainText = tempDiv.textContent || tempDiv.innerText || "";
          if (plainText.trim()) {
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(60, 60, 60);
            const lines = pdf.splitTextToSize(plainText.trim(), contentWidth - 12);
            for (const line of lines) {
              checkPageBreak(6);
              pdf.text(line, margin + 12, y);
              y += 5;
            }
            y += 2;
          }
        }

        // Colors
        if (step.colorsUsed) {
          checkPageBreak(10);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(124, 58, 237);
          pdf.text("Colores: ", margin + 12, y);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(80, 80, 80);
          const colorsText = step.colorsUsed.split(",").map((c) => c.trim()).join("  •  ");
          const colorLines = pdf.splitTextToSize(colorsText, contentWidth - 30);
          pdf.text(colorLines, margin + 30, y);
          y += colorLines.length * 5 + 3;
        }

        // Images note
        const images = step.media.filter((m) => m.mediaType === "image");
        if (images.length > 0) {
          checkPageBreak(8);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "italic");
          pdf.setTextColor(150, 150, 150);
          pdf.text(`📷 ${images.length} imagen(es) adjunta(s)`, margin + 12, y);
          y += 6;
        }

        // Step divider
        if (i < processes.length - 1) {
          y += 3;
          checkPageBreak(8);
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.2);
          pdf.line(margin, y, pageWidth - margin, y);
          y += 8;
        }
      }

      pdf.save(`guia-pintura-${miniature.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
    } finally {
      setExporting(false);
    }
  }, [processes, miniature.name]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-5 w-5 text-primary" />
            Proceso de Pintura
          </CardTitle>
          <div className="flex items-center gap-2">
            {processes.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting}
                className="h-8"
              >
                <FileDown className="h-4 w-4 mr-1" />
                {exporting ? "Exportando..." : "Exportar PDF"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowNewStep(true)} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> Añadir paso
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={printRef}>
          {processes.length === 0 ? (
            <div className="text-center py-8">
              <Palette className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Sin pasos de pintura registrados.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Crea una guía paso a paso del proceso de pintura de esta miniatura. Podrás añadir texto enriquecido, imágenes y vídeos.
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowNewStep(true)}>
                <Plus className="h-4 w-4 mr-1" /> Crear primer paso
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {processes.map((process, idx) => (
                  <StepEditor
                    key={process.id}
                    process={process}
                    stepNumber={idx + 1}
                    onSave={handleSaveStep}
                    onDelete={handleDeleteStep}
                    onMediaUpload={handleMediaUpload}
                    onMediaDelete={handleMediaDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>

      <NewStepDialog
        open={showNewStep}
        onClose={() => setShowNewStep(false)}
        onAdd={handleAddStep}
      />
    </Card>
  );
}
