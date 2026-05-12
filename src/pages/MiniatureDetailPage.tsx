import { PaintingProcessEditor } from "@/components/painting/PaintingProcessEditor";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    addImage,
    createTag,
    deleteImage,
    deleteMiniature,
    getAllTags,
    getArmyById,
    getGameById,
    getMiniatureById,
    saveImageToAppData,
    toggleFavorite,
    updateMiniature
} from "@/db";
import type {
    ArmyWithStats,
    Game,
    MiniatureCategory,
    MiniatureWithDetails,
    PaintStatusType,
    Tag
} from "@/types";
import { MINIATURE_CATEGORIES, PAINT_STATUSES, getCurrentPaintStep, getNextPaintStep, getStatusesUpTo, isMiniatureComplete } from "@/types";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Check,
    Edit,
    Heart,
    ImageIcon,
    Palette,
    Plus,
    Save,
    Tag as TagIcon,
    Trash2,
    Upload,
    X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function MiniatureDetailPage() {
  const { gameId, armyId, miniatureId } = useParams<{
    gameId: string;
    armyId: string;
    miniatureId: string;
  }>();
  const navigate = useNavigate();
  const [miniature, setMiniature] = useState<MiniatureWithDetails | null>(null);
  const [army, setArmy] = useState<ArmyWithStats | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<MiniatureCategory>("infantry");
  const [editQuantity, setEditQuantity] = useState(1);
  const [editNotes, setEditNotes] = useState("");
  const [editStatuses, setEditStatuses] = useState<PaintStatusType[]>([]);

  // Painting process
  // (handled by PaintingProcessEditor component)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Image lightbox & drag
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const loadData = useCallback(async () => {
    if (!miniatureId || !armyId || !gameId) return;
    try {
      const [mini, a, g, tags] = await Promise.all([
        getMiniatureById(miniatureId),
        getArmyById(armyId),
        getGameById(gameId),
        getAllTags(),
      ]);
      setMiniature(mini);
      setArmy(a);
      setGame(g);
      setAllTags(tags);
      if (mini) {
        setEditName(mini.name);
        setEditCategory(mini.category);
        setEditQuantity(mini.quantity);
        setEditNotes(mini.notes);
        setEditStatuses([...mini.statuses]);
      }
    } catch (err) {
      console.error("Failed to load miniature:", err);
    } finally {
      setLoading(false);
    }
  }, [miniatureId, armyId, gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drag & drop file handler via Tauri
  useEffect(() => {
    const imageExts = ["png", "jpg", "jpeg", "webp", "gif"];
    const unlisten = getCurrentWebviewWindow().onDragDropEvent(async (event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setIsDragging(true);
      } else if (event.payload.type === "leave") {
        setIsDragging(false);
      } else if (event.payload.type === "drop") {
        setIsDragging(false);
        if (!miniature) return;
        const paths = event.payload.paths;
        for (const filePath of paths) {
          const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
          if (!imageExts.includes(ext)) continue;
          try {
            const savedPath = await saveImageToAppData(filePath, "miniatures");
            const fileName = filePath.split("/").pop() ?? "image";
            await addImage(miniature.id, savedPath, fileName, 0);
          } catch (err) {
            console.error("Failed to save dropped image:", err);
          }
        }
        await loadData();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [miniature, loadData]);

  async function handleSaveEdit() {
    if (!miniature) return;
    try {
      await updateMiniature({
        id: miniature.id,
        name: editName.trim(),
        category: editCategory,
        quantity: editQuantity,
        paintedCount: isMiniatureComplete(editStatuses) ? editQuantity : 0,
        notes: editNotes,
        statuses: editStatuses,
      });
      setEditing(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save miniature:", err);
    }
  }

  async function handleToggleStatus(statusType: PaintStatusType) {
    if (!miniature) return;
    try {
      const clickedStatus = PAINT_STATUSES.find((s) => s.type === statusType);
      if (!clickedStatus) return;

      const currentStep = getCurrentPaintStep(miniature.statuses);
      let newStatuses: PaintStatusType[];

      if (currentStep && currentStep.type === statusType) {
        // Clicking current step → go back one step
        newStatuses = PAINT_STATUSES
          .filter((s) => s.sortOrder < clickedStatus.sortOrder)
          .map((s) => s.type);
      } else {
        // Mark all steps up to and including clicked
        newStatuses = getStatusesUpTo(statusType);
      }

      const complete = isMiniatureComplete(newStatuses);
      await updateMiniature({
        id: miniature.id,
        statuses: newStatuses,
        paintedCount: complete ? miniature.quantity : 0,
      });
      await loadData();
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  }

  async function handleToggleFavorite() {
    if (!miniature) return;
    try {
      await toggleFavorite(miniature.id);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  }

  async function handleDelete() {
    if (!miniature) return;
    try {
      await deleteMiniature(miniature.id);
      navigate(`/games/${gameId}/armies/${armyId}`);
    } catch (err) {
      console.error("Failed to delete miniature:", err);
    }
  }

  async function handleToggleTag(tagId: string) {
    if (!miniature) return;
    const currentTagIds = miniature.tags.map((t) => t.id);
    const newTags = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    await updateMiniature({ id: miniature.id, tags: newTags });
    await loadData();
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !miniature) return;
    const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316"];
    const color = colors[allTags.length % colors.length]!;
    const tag = await createTag(newTagName.trim(), color);
    setNewTagName("");
    setShowTagInput(false);
    // Auto-assign to this miniature
    const currentTagIds = miniature.tags.map((t) => t.id);
    await updateMiniature({ id: miniature.id, tags: [...currentTagIds, tag.id] });
    await loadData();
  }

  async function handleUploadImage() {
    if (!miniature) return;
    try {
      const files = await open({
        multiple: true,
        filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      });
      if (!files) return;
      const paths = Array.isArray(files) ? files : [files];
      for (const file of paths) {
        const savedPath = await saveImageToAppData(file, "miniatures");
        const fileName = file.split("/").pop() ?? "image";
        await addImage(miniature.id, savedPath, fileName, 0);
      }
      await loadData();
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await deleteImage(imageId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!miniature || !army || !game) {
    return (
      <EmptyState
        title="Miniatura no encontrada"
        description="La miniatura que buscas no existe"
        action={{ label: "Volver", onClick: () => navigate(`/games/${gameId}/armies/${armyId}`) }}
      />
    );
  }

  const catLabel =
    MINIATURE_CATEGORIES.find((c) => c.value === miniature.category)?.label ??
    miniature.category;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/games/${gameId}/armies/${armyId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{game.name}</span>
                <span>›</span>
                <span>{army.name}</span>
              </div>
              {editing ? (
                <div className="mt-1 space-y-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold h-auto py-1"
                  />
                  <div className="flex gap-3">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as MiniatureCategory)}
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      {MINIATURE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editQuantity}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setEditQuantity(val);
                        }}
                        className="w-20"
                      />
                    </div>
                  </div>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notas..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Save className="h-4 w-4 mr-1" /> Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="font-display text-3xl font-bold tracking-tight mt-1">
                    {miniature.name}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary">{miniature.quantity}x</Badge>
                    <Badge variant="outline">{catLabel}</Badge>
                    {(() => {
                      const complete = isMiniatureComplete(miniature.statuses);
                      const current = getCurrentPaintStep(miniature.statuses);
                      if (complete) {
                        return (
                          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-500">
                            ✓ Completada
                          </Badge>
                        );
                      }
                      if (current) {
                        return (
                          <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-500">
                            {current.name}
                          </Badge>
                        );
                      }
                      return (
                        <Badge variant="outline">
                          Sin empezar
                        </Badge>
                      );
                    })()}
                  </div>
                  {miniature.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{miniature.notes}</p>
                  )}
                </>
              )}
            </div>
          </div>
          {!editing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleToggleFavorite}>
                <Heart
                  className={`h-5 w-5 ${miniature.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
                <Edit className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Main info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Paint Status - Checkboxes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-5 w-5 text-primary" />
                  Estado de Pintura
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {PAINT_STATUSES.map((status, idx) => {
                    const active = miniature.statuses.includes(status.type);
                    const currentStep = getCurrentPaintStep(miniature.statuses);
                    const isCurrent = currentStep?.type === status.type;
                    const isLast = idx === PAINT_STATUSES.length - 1;
                    return (
                      <div key={status.type} className="flex items-stretch gap-3">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                          <motion.button
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleToggleStatus(status.type)}
                            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                              isCurrent
                                ? "border-primary bg-primary shadow-md shadow-primary/30"
                                : active
                                  ? "border-primary/60 bg-primary/20"
                                  : "border-muted-foreground/20 bg-card hover:border-muted-foreground/40"
                            }`}
                          >
                            {active && <Check className={`h-3.5 w-3.5 ${isCurrent ? "text-primary-foreground" : "text-primary"}`} />}
                          </motion.button>
                          {!isLast && (
                            <div className={`w-0.5 flex-1 min-h-[12px] ${active ? "bg-primary/40" : "bg-muted"}`} />
                          )}
                        </div>
                        {/* Label */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(status.type)}
                          className={`flex-1 pb-3 pt-1 text-left text-sm transition-colors ${
                            isCurrent ? "font-semibold text-foreground" : active ? "font-medium text-foreground/80" : "text-muted-foreground hover:text-foreground/60"
                          }`}
                        >
                          {status.name}
                          {isCurrent && (
                            <span className="ml-2 text-xs text-primary font-medium">← Actual</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Painting Process */}
            <PaintingProcessEditor miniature={miniature} onUpdate={loadData} />

            {/* Images */}
            <Card className={isDragging ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Imágenes
                    {miniature.images.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{miniature.images.length}</Badge>
                    )}
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleUploadImage}>
                    <Upload className="h-4 w-4 mr-1" /> Subir fotos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {miniature.images.length === 0 ? (
                  <div className={`text-center py-8 rounded-lg border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}>
                    <Upload className={`h-10 w-10 mx-auto mb-2 ${isDragging ? "text-primary" : "text-muted-foreground/40"}`} />
                    <p className="text-sm text-muted-foreground">
                      {isDragging ? "Suelta las imágenes aquí" : "Arrastra imágenes aquí o haz clic para subir"}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={handleUploadImage}>
                      <Upload className="h-4 w-4 mr-1" /> Seleccionar fotos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {miniature.images.map((img) => (
                        <motion.div
                          key={img.id}
                          whileHover={{ scale: 1.03 }}
                          className="group relative cursor-pointer overflow-hidden rounded-lg"
                          onClick={() => setLightboxImage(convertFileSrc(img.filePath))}
                        >
                          <img
                            src={convertFileSrc(img.filePath)}
                            alt={img.fileName}
                            className="aspect-square w-full object-cover"
                            loading="lazy"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(img.id);
                            }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </motion.div>
                    ))}
                    </div>
                    {isDragging && (
                      <div className="text-center py-4 rounded-lg border-2 border-dashed border-primary bg-primary/5">
                        <p className="text-sm text-primary font-medium">Suelta las imágenes aquí</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Categoría</span>
                  <span className="font-medium">{catLabel}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cantidad</span>
                  <span className="font-medium">{miniature.quantity}x</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado actual</span>
                  {(() => {
                    const complete = isMiniatureComplete(miniature.statuses);
                    const current = getCurrentPaintStep(miniature.statuses);
                    if (complete) return <span className="font-semibold text-emerald-500">Completada</span>;
                    if (current) return <span className="font-semibold text-amber-500">{current.name}</span>;
                    return <span className="font-medium text-muted-foreground">Sin empezar</span>;
                  })()}
                </div>
                <Separator />
                {!isMiniatureComplete(miniature.statuses) && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Siguiente paso</span>
                      {(() => {
                        const next = getNextPaintStep(miniature.statuses);
                        return next ? (
                          <span className="font-medium text-primary">{next.name}</span>
                        ) : null;
                      })()}
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pasos de pintura</span>
                  <span className="font-medium">{miniature.paintingProcesses.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fotos</span>
                  <span className="font-medium">{miniature.images.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Creada</span>
                  <span className="font-medium text-xs">
                    {new Date(miniature.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TagIcon className="h-4 w-4 text-primary" />
                    Tags
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTagInput(!showTagInput)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {showTagInput && (
                  <div className="flex gap-2">
                    <Input
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nuevo tag..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setShowTagInput(false); }}
                      autoFocus
                    />
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowTagInput(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag) => {
                    const active = miniature.tags.some((t) => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all ${
                          active ? "opacity-100" : "opacity-40 hover:opacity-70"
                        }`}
                        style={{
                          backgroundColor: active ? `${tag.color}20` : "transparent",
                          color: tag.color,
                          borderColor: active ? tag.color : `${tag.color}50`,
                        }}
                      >
                        {active && <Check className="h-2.5 w-2.5" />}
                        {tag.name}
                      </button>
                    );
                  })}
                  {allTags.length === 0 && !showTagInput && (
                    <p className="text-xs text-muted-foreground">
                      Sin tags. Crea uno para organizar tus miniaturas.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirm */}
        <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar miniatura?</DialogTitle>
              <DialogDescription>
                Se eliminará "{miniature.name}" y todos sus datos. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">Vista de imagen</DialogTitle>
            {lightboxImage && (
              <img src={lightboxImage} alt="Preview" className="max-h-[80vh] w-full rounded-xl object-contain" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
