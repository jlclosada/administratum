import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    createMiniature,
    deleteMiniature,
    getArmyById,
    getGameById,
    getImagesByArmy,
    getMiniaturesByArmy,
    toggleFavorite,
} from "@/db";
import type {
    ArmyWithStats,
    Game,
    MiniatureCategory,
    MiniatureImage,
    MiniatureWithDetails,
    PaintStatusType
} from "@/types";
import { MINIATURE_CATEGORIES, PAINT_STATUSES } from "@/types";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
    ArrowLeft,
    Box,
    Check,
    ChevronRight,
    Crown,
    Heart,
    ImageIcon,
    Mountain,
    Plus,
    Shield,
    Skull,
    Sword,
    Trash2,
    Truck,
    Users,
    X,
    ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  infantry: Users,
  character: Crown,
  vehicle: Truck,
  monster: Skull,
  squad: Shield,
  terrain: Mountain,
  other: Box,
};

export function ArmyDetailPage() {
  const { gameId, armyId } = useParams<{ gameId: string; armyId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [army, setArmy] = useState<ArmyWithStats | null>(null);
  const [miniatures, setMiniatures] = useState<MiniatureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [armyImages, setArmyImages] = useState<(MiniatureImage & { miniatureName: string })[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<MiniatureCategory>("infantry");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formNotes, setFormNotes] = useState("");
  const [formStatuses, setFormStatuses] = useState<PaintStatusType[]>([]);
  const [formStore, setFormStore] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPurchasedAt, setFormPurchasedAt] = useState("");

  const loadData = useCallback(async () => {
    if (!gameId || !armyId) return;
    try {
      const [g, a, minis] = await Promise.all([
        getGameById(gameId),
        getArmyById(armyId),
        getMiniaturesByArmy(armyId),
      ]);
      setGame(g);
      setArmy(a);
      setMiniatures(minis);
      try {
        const imgs = await getImagesByArmy(armyId);
        setArmyImages(imgs);
      } catch { /* no images yet */ }
    } catch (err) {
      console.error("Failed to load army:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId, armyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setFormName("");
    setFormCategory("infantry");
    setFormQuantity(1);
    setFormNotes("");
    setFormStatuses([]);
    setFormStore("");
    setFormPrice("");
    setFormPurchasedAt("");
  }

  function toggleFormStatus(statusType: PaintStatusType) {
    setFormStatuses((prev) =>
      prev.includes(statusType)
        ? prev.filter((s) => s !== statusType)
        : [...prev, statusType]
    );
  }

  async function handleCreate() {
    if (!formName.trim() || !armyId) return;
    try {
      await createMiniature({
        armyId,
        name: formName.trim(),
        category: formCategory,
        quantity: formQuantity,
        notes: formNotes,
        statuses: formStatuses,
        store: formStore.trim() || null,
        purchasePrice: formPrice ? parseFloat(formPrice) : null,
        purchasedAt: formPurchasedAt || null,
      });
      setShowCreateDialog(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to create miniature:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMiniature(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete miniature:", err);
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await toggleFavorite(id);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!army || !game) {
    return (
      <EmptyState
        title="Ejército no encontrado"
        description="El ejército que buscas no existe"
        action={{ label: "Volver", onClick: () => navigate(`/games/${gameId}`) }}
      />
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/games/${gameId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {game.name}
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {army.name}
              </h1>
              {army.description && (
                <p className="text-muted-foreground">{army.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{army.totalMiniatures} miniaturas</span>
                  <span>·</span>
                  <span>{army.totalPainted} pintadas</span>
                  <span>·</span>
                  <span className="font-medium text-primary">
                    {army.completionPercentage}%
                  </span>
                </div>
              </div>
              <Progress
                value={army.completionPercentage}
                className="mt-2 h-2 w-64"
              />
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir Miniatura
          </Button>
        </div>

        {/* Miniatures Table */}
        {miniatures.length === 0 ? (
          <EmptyState
            icon={<Sword className="h-8 w-8 text-muted-foreground" />}
            title="Sin miniaturas"
            description="Añade tu primera miniatura a este ejército"
            action={{
              label: "Añadir Miniatura",
              onClick: () => {
                resetForm();
                setShowCreateDialog(true);
              },
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Miniatura</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Cant.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estados</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miniatures.map((mini) => {
                      const CatIcon = CATEGORY_ICONS[mini.category] ?? Box;
                      return (
                        <tr
                          key={mini.id}
                          className="group border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-accent/50"
                          onClick={() => navigate(`/games/${gameId}/armies/${armyId}/miniatures/${mini.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <CatIcon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-sm truncate">{mini.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {MINIATURE_CATEGORIES.find((c) => c.value === mini.category)?.label ?? mini.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="text-xs">{mini.quantity}x</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {PAINT_STATUSES.map((status) => {
                                const active = mini.statuses.includes(status.type);
                                return (
                                  <div
                                    key={status.type}
                                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                    style={{
                                      backgroundColor: active ? `${status.color}20` : "transparent",
                                      color: active ? status.color : "var(--muted-foreground)",
                                      opacity: active ? 1 : 0.3,
                                    }}
                                  >
                                    <div
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: active ? status.color : "var(--muted-foreground)" }}
                                    />
                                    {status.name}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                onClick={(e) => handleToggleFavorite(e, mini.id)}
                              >
                                <Heart
                                  className={`h-3.5 w-3.5 ${
                                    mini.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(mini.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Army Images */}
        {armyImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-xl font-bold">Imágenes del ejército</h2>
              <Badge variant="secondary">{armyImages.length}</Badge>
            </div>
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {armyImages.map((img) => (
                <div key={img.id} className="mb-4 break-inside-avoid">
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                    onClick={() => setLightboxImage(convertFileSrc(img.filePath))}
                  >
                    <div className="relative">
                      <img
                        src={convertFileSrc(img.filePath)}
                        alt={img.fileName}
                        className="w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                        <ZoomIn className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground truncate">{img.miniatureName}</p>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <DialogTitle className="sr-only">Vista de imagen</DialogTitle>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-12 top-0 text-white hover:bg-white/20"
                onClick={() => setLightboxImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              {lightboxImage && (
                <img
                  src={lightboxImage}
                  alt="Preview"
                  className="max-h-[80vh] w-full rounded-xl object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Miniature Dialog */}
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Añadir Miniatura</DialogTitle>
              <DialogDescription>
                Añade una nueva miniatura al ejército
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Marines Rúbrica, Magnus el Rojo..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as MiniatureCategory)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    {MINIATURE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              {/* Status Checkboxes */}
              <div className="space-y-2">
                <Label>Estados de Pintura</Label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
                  {PAINT_STATUSES.map((status) => {
                    const active = formStatuses.includes(status.type);
                    return (
                      <button
                        key={status.type}
                        type="button"
                        onClick={() => toggleFormStatus(status.type)}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                          active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                            active ? "border-primary bg-primary" : "border-muted-foreground/30"
                          }`}
                        >
                          {active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notas sobre la miniatura..."
                  rows={2}
                />
              </div>

              {/* Purchase Info */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Información de compra</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tienda</Label>
                    <Input
                      value={formStore}
                      onChange={(e) => setFormStore(e.target.value)}
                      placeholder="Ej: GW, Amazon..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Precio (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha de compra</Label>
                  <Input
                    type="date"
                    value={formPurchasedAt}
                    onChange={(e) => setFormPurchasedAt(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!formName.trim()}
              >
                Añadir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar miniatura?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
