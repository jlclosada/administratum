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
    addPaintingProcess,
    deleteMiniature,
    deletePaintingProcess,
    getArmyById,
    getGameById,
    getMiniatureById,
    toggleFavorite,
    updateMiniature
} from "@/db";
import type {
    ArmyWithStats,
    Game,
    MiniatureCategory,
    MiniatureWithDetails,
    PaintStatusType
} from "@/types";
import { MINIATURE_CATEGORIES, PAINT_STATUSES } from "@/types";
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
    Trash2
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
  const [showAddProcess, setShowAddProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState("");
  const [processDesc, setProcessDesc] = useState("");
  const [processColors, setProcessColors] = useState("");

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!miniatureId || !armyId || !gameId) return;
    try {
      const [mini, a, g] = await Promise.all([
        getMiniatureById(miniatureId),
        getArmyById(armyId),
        getGameById(gameId),
      ]);
      setMiniature(mini);
      setArmy(a);
      setGame(g);
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

  async function handleSaveEdit() {
    if (!miniature) return;
    try {
      await updateMiniature({
        id: miniature.id,
        name: editName.trim(),
        category: editCategory,
        quantity: editQuantity,
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
      const newStatuses = miniature.statuses.includes(statusType)
        ? miniature.statuses.filter((s) => s !== statusType)
        : [...miniature.statuses, statusType];
      await updateMiniature({
        id: miniature.id,
        statuses: newStatuses,
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

  async function handleAddProcess() {
    if (!miniature || !processTitle.trim()) return;
    try {
      const nextOrder = miniature.paintingProcesses.length;
      await addPaintingProcess({
        miniatureId: miniature.id,
        stepOrder: nextOrder,
        title: processTitle.trim(),
        description: processDesc.trim(),
        colorsUsed: processColors.trim(),
      });
      setProcessTitle("");
      setProcessDesc("");
      setProcessColors("");
      setShowAddProcess(false);
      await loadData();
    } catch (err) {
      console.error("Failed to add painting process:", err);
    }
  }

  async function handleDeleteProcess(processId: string) {
    try {
      await deletePaintingProcess(processId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete painting process:", err);
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
                    <Input
                      type="number"
                      min={1}
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                    />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PAINT_STATUSES.map((status) => {
                    const active = miniature.statuses.includes(status.type);
                    return (
                      <motion.button
                        key={status.type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleStatus(status.type)}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                          active
                            ? "border-primary/50 bg-primary/10"
                            : "border-border bg-card hover:border-muted-foreground/30"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                            active ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}
                        >
                          {active && <Check className="h-4 w-4 text-primary-foreground" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                            {status.name}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Painting Process */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="h-5 w-5 text-primary" />
                    Proceso de Pintura
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAddProcess(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Añadir paso
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {miniature.paintingProcesses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin pasos de pintura registrados. Añade el proceso que seguiste para pintar esta miniatura.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {miniature.paintingProcesses.map((process, idx) => (
                      <motion.div
                        key={process.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group relative rounded-lg border border-border bg-card/50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold">{process.title}</h4>
                              {process.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {process.description}
                                </p>
                              )}
                              {process.colorsUsed && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {process.colorsUsed.split(",").map((color, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {color.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteProcess(process.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Imágenes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {miniature.images.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin imágenes. Próximamente podrás subir fotos de tus miniaturas.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {miniature.images.map((img) => (
                      <motion.div
                        key={img.id}
                        whileHover={{ scale: 1.03 }}
                        className="cursor-pointer overflow-hidden rounded-lg"
                        onClick={() => setLightboxImage(img.filePath)}
                      >
                        <img
                          src={img.filePath}
                          alt={img.fileName}
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                      </motion.div>
                    ))}
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
                  <span className="text-muted-foreground">Estados activos</span>
                  <span className="font-medium">{miniature.statuses.length} / {PAINT_STATUSES.length}</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Progreso</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PAINT_STATUSES.map((status) => {
                      const active = miniature.statuses.includes(status.type);
                      return (
                        <div
                          key={status.type}
                          className={`h-4 w-4 rounded-full border-2 ${
                            active ? "border-transparent" : "border-muted opacity-30"
                          }`}
                          style={{ backgroundColor: active ? status.color : "transparent" }}
                          title={status.name}
                        />
                      );
                    })}
                  </div>
                </div>
                <Separator />
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

            {miniature.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {miniature.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
                        variant="outline"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Add Painting Process Dialog */}
        <Dialog open={showAddProcess} onOpenChange={setShowAddProcess}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Paso de Pintura</DialogTitle>
              <DialogDescription>
                Describe el paso del proceso de pintura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título del paso</Label>
                <Input
                  value={processTitle}
                  onChange={(e) => setProcessTitle(e.target.value)}
                  placeholder="Ej: Capa base, Lavado, Luces..."
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={processDesc}
                  onChange={(e) => setProcessDesc(e.target.value)}
                  placeholder="Descripción del paso..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Colores utilizados (separados por comas)</Label>
                <Input
                  value={processColors}
                  onChange={(e) => setProcessColors(e.target.value)}
                  placeholder="Ej: Abaddon Black, Retributor Armour, Nuln Oil..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProcess(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProcess} disabled={!processTitle.trim()}>
                Añadir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
