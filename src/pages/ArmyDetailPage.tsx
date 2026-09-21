import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { MiniatureStatusBadge, miniatureReadyClass } from "@/components/shared/MiniatureStatusBadge";
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
    getUnitCatalog,
    toggleFavorite,
} from "@/db";
import { isWarhammer40k, resumenUnidad, unitBelongsToArmy, canonicalFactionName } from "@/lib/mfm";
import type {
    ArmyWithStats,
    CatalogPricingTier,
    Game,
    MiniatureCategory,
    MiniatureImage,
    MiniatureWithDetails,
    PaintStatusType,
    UnitCatalogEntry,
} from "@/types";
import { MINIATURE_CATEGORIES, PAINT_STATUSES, getCurrentPaintStep, getStatusesUpTo, isMiniatureComplete } from "@/types";
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
    Search,
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

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPaintStatus, setFilterPaintStatus] = useState<string>("all");

  const filteredMiniatures = miniatures.filter((mini) => {
    if (searchQuery && !mini.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== "all" && mini.category !== filterCategory) return false;
    if (filterPaintStatus === "complete" && !isMiniatureComplete(mini.statuses)) return false;
    if (filterPaintStatus === "pending" && (isMiniatureComplete(mini.statuses) || mini.statuses.length === 0)) return false;
    if (filterPaintStatus === "none" && mini.statuses.length > 0) return false;
    return true;
  });

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<MiniatureCategory>("infantry");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formNotes, setFormNotes] = useState("");
  const [formStatuses, setFormStatuses] = useState<PaintStatusType[]>([]);
  const [formStore, setFormStore] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPurchasedAt, setFormPurchasedAt] = useState("");
  const [catalogUnits, setCatalogUnits] = useState<UnitCatalogEntry[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState<UnitCatalogEntry | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [allowCustomName, setAllowCustomName] = useState(false);

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
    setCatalogQuery("");
    setSelectedCatalog(null);
    setAllowCustomName(false);
  }

  function selectFormStep(statusType: PaintStatusType) {
    const currentStep = getCurrentPaintStep(formStatuses);
    if (currentStep && currentStep.type === statusType) {
      // Clicking current → go back one step
      const target = PAINT_STATUSES.find((s) => s.type === statusType);
      setFormStatuses(PAINT_STATUSES.filter((s) => s.sortOrder < (target?.sortOrder ?? 0)).map((s) => s.type));
    } else {
      setFormStatuses(getStatusesUpTo(statusType));
    }
  }

  useEffect(() => {
    if (!showCreateDialog || !game || !isWarhammer40k(game.name)) return;
    let cancelled = false;
    setCatalogLoading(true);
    getUnitCatalog("Warhammer 40,000")
      .then((rows) => {
        if (!cancelled) setCatalogUnits(rows);
      })
      .catch(() => {
        if (!cancelled) setCatalogUnits([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showCreateDialog, game]);

  function pickCatalogUnit(unit: UnitCatalogEntry) {
    setSelectedCatalog(unit);
    setFormName(unit.name);
    setFormCategory(unit.category);
    setFormQuantity(1);
    setCatalogQuery(unit.name);
    setAllowCustomName(false);
  }

  function armyCatalog(): UnitCatalogEntry[] {
    const name = army?.name ?? "";
    return catalogUnits
      .filter((u) => unitBelongsToArmy(name, u.factionName))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function catalogMatches(): UnitCatalogEntry[] {
    const q = catalogQuery.trim().toLowerCase();
    return armyCatalog()
      .filter((u) => !q || u.name.toLowerCase().includes(q))
      .slice(0, 20);
  }

  async function handleCreate() {
    if (!formName.trim() || !armyId) return;
    try {
      await createMiniature({
        armyId,
        name: formName.trim(),
        category: formCategory,
        quantity: formQuantity,
        paintedCount: isMiniatureComplete(formStatuses) ? formQuantity : 0,
        notes: formNotes,
        statuses: formStatuses,
        store: formStore.trim() || null,
        purchasePrice: formPrice ? parseFloat(formPrice) : null,
        purchasedAt: formPurchasedAt || null,
        catalogUnitId: selectedCatalog?.id ?? null,
        pointsSnapshot: (selectedCatalog?.pricing as CatalogPricingTier[] | undefined) ?? null,
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
        {/* Hero header */}
        <div className="overflow-hidden rounded-2xl border border-border/60 shadow-lg">
          <div
            className="relative h-36 w-full overflow-hidden sm:h-auto sm:min-h-[16rem] sm:aspect-[5/1]"
            style={
              army.coverImage
                ? undefined
                : {
                    background: `linear-gradient(135deg, ${
                      army.colorPrimary ?? "#8b5cf6"
                    }55 0%, ${army.colorPrimary ?? "#8b5cf6"}18 55%, transparent 100%)`,
                  }
            }
          >
            {army.coverImage && (
              <img
                src={army.coverImage}
                alt={army.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0";
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/games/${gameId}`)}
              className="absolute left-3 top-3 z-10 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="absolute inset-x-0 bottom-0 hidden items-end justify-between gap-4 p-6 sm:flex">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                  {game.name}
                </p>
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border-2 border-white/50"
                    style={{ backgroundColor: army.colorPrimary ?? "#8b5cf6" }}
                  />
                  <h1 className="font-display text-4xl font-bold tracking-tight text-white drop-shadow-lg">
                    {army.name}
                  </h1>
                </div>
                {army.description && (
                  <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/75">
                    {army.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-white/90">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                    {army.totalMiniatures} miniaturas
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                    {army.totalPainted} pintadas
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold backdrop-blur-sm">
                    {(army.totalPoints ?? 0).toLocaleString("es-ES")} pts
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 font-semibold backdrop-blur-sm">
                    {army.completionPercentage}% completado
                  </span>
                </div>
                <Progress
                  value={army.completionPercentage}
                  className="mt-3 h-1.5 w-full max-w-xs bg-white/20"
                />
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateDialog(true);
                }}
                variant="gradient"
                className="h-9 shrink-0 gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Añadir Miniatura
              </Button>
            </div>
          </div>
          <div className="space-y-3 p-4 sm:hidden">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {game.name}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: army.colorPrimary ?? "#8b5cf6" }}
                />
                <h1 className="font-display text-xl font-bold tracking-tight">
                  {army.name}
                </h1>
              </div>
              {army.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {army.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {army.totalMiniatures} miniaturas
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                {army.totalPainted} pintadas
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 font-semibold">
                {(army.totalPoints ?? 0).toLocaleString("es-ES")} pts
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">
                {army.completionPercentage}%
              </span>
            </div>
            <Progress value={army.completionPercentage} className="h-1.5" />
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
              variant="gradient"
              className="h-11 w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Añadir Miniatura
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        {miniatures.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar miniaturas..."
                className="h-11 pl-9 sm:h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:h-9 sm:w-auto"
            >
              <option value="all">Todas las categorías</option>
              {MINIATURE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              value={filterPaintStatus}
              onChange={(e) => setFilterPaintStatus(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm sm:h-9 sm:w-auto"
            >
              <option value="all">Todo progreso</option>
              <option value="complete">Completadas</option>
              <option value="pending">En progreso</option>
              <option value="none">Sin empezar</option>
            </select>
            </div>
            {(searchQuery || filterCategory !== "all" || filterPaintStatus !== "all") && (
              <Button variant="ghost" size="sm" className="h-11 sm:h-9" onClick={() => { setSearchQuery(""); setFilterCategory("all"); setFilterPaintStatus("all"); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Limpiar
              </Button>
            )}
          </div>
        )}

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
        ) : filteredMiniatures.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No se encontraron miniaturas con los filtros actuales</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 md:hidden">
                {filteredMiniatures.map((mini) => {
                  const CatIcon = CATEGORY_ICONS[mini.category] ?? Box;
                  return (
                    <div
                      key={mini.id}
                      className={`min-w-0 space-y-2 px-3 py-3 ${miniatureReadyClass(mini.statuses)}`}
                    >
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-start gap-3 text-left"
                        onClick={() => navigate(`/games/${gameId}/armies/${armyId}/miniatures/${mini.id}`)}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <CatIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-sm leading-snug">{mini.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {mini.quantity}x
                            {MINIATURE_CATEGORIES.find((c) => c.value === mini.category)?.label
                              ? ` · ${MINIATURE_CATEGORIES.find((c) => c.value === mini.category)?.label}`
                              : ""}
                          </p>
                          <div className="mt-1.5">
                            <MiniatureStatusBadge statuses={mini.statuses} />
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 gap-1.5 px-3"
                          onClick={(e) => handleToggleFavorite(e, mini.id)}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              mini.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
                            }`}
                          />
                          Favorito
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-10 gap-1.5 px-3 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(mini.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Miniatura</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMiniatures.map((mini) => {
                      const CatIcon = CATEGORY_ICONS[mini.category] ?? Box;
                      return (
                        <tr
                          key={mini.id}
                          className={`group cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-accent/50 ${miniatureReadyClass(mini.statuses)}`}
                          onClick={() => navigate(`/games/${gameId}/armies/${armyId}/miniatures/${mini.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <CatIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-medium">{mini.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {mini.quantity}x
                                  {mini.pointsSnapshot?.length
                                    ? ` · ${resumenUnidad({ pricing: mini.pointsSnapshot })}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {MINIATURE_CATEGORIES.find((c) => c.value === mini.category)?.label ?? mini.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <MiniatureStatusBadge statuses={mini.statuses} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
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
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(mini.id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                    onClick={() => setLightboxImage(img.filePath)}
                  >
                    <div className="relative">
                      <img
                        src={img.filePath}
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
                className="absolute right-2 top-2 z-10 bg-black/40 text-white hover:bg-black/60"
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
          <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden sm:max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Añadir Miniatura</DialogTitle>
              <DialogDescription>
                {isWarhammer40k(game?.name)
                  ? `Solo unidades de ${army?.name ?? "este ejército"}${
                      canonicalFactionName(army?.name ?? "")
                        ? ` (${canonicalFactionName(army?.name ?? "")})`
                        : ""
                    }.`
                  : "Añade una nueva miniatura al ejército"}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
              {isWarhammer40k(game?.name) && (
                <div className="space-y-2">
                  <Label>Buscar en el catálogo</Label>
                  <Input
                    value={catalogQuery}
                    onChange={(e) => {
                      setCatalogQuery(e.target.value);
                      if (selectedCatalog) setSelectedCatalog(null);
                    }}
                    placeholder={`Buscar en ${army?.name ?? "este ejército"}...`}
                    autoFocus
                  />
                  {catalogLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando catálogo...</p>
                  ) : catalogUnits.length === 0 ? (
                    <p className="text-xs text-amber-600">
                      El catálogo aún no está en la base de datos. Un administrador debe sincronizarlo en el panel.
                    </p>
                  ) : armyCatalog().length === 0 ? (
                    <p className="text-xs text-amber-600">
                      No hay fichas MFM para «{army?.name}». Usa el nombre oficial
                      de la facción (por ejemplo Thousand Sons para Mil Hijos) o
                      añade la miniatura a mano.
                    </p>
                  ) : (
                    <div className="max-h-[40vh] divide-y divide-border/60 overflow-y-auto rounded-md border border-border sm:max-h-48">
                      {catalogMatches().map((unit) => (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => pickCatalogUnit(unit)}
                          className={`flex min-h-12 w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                            selectedCatalog?.id === unit.id ? "bg-primary/10" : ""
                          }`}
                        >
                          <span className="font-medium">{unit.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {unit.factionName}
                            {unit.legends ? " · Legends" : ""}
                            {resumenUnidad(unit) ? ` · ${resumenUnidad(unit)}` : ""}
                          </span>
                        </button>
                      ))}
                      {catalogMatches().length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {catalogQuery.trim()
                            ? "Sin coincidencias en este ejército."
                            : "Escribe para filtrar las unidades de este ejército."}
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      setAllowCustomName(true);
                      setSelectedCatalog(null);
                    }}
                  >
                    La miniatura no está en el catálogo
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Marines Rúbrica, Magnus el Rojo..."
                  disabled={isWarhammer40k(game?.name) && !!selectedCatalog && !allowCustomName}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setFormQuantity(val);
                    }}
                  />
                </div>
              </div>

              {/* Step Selector */}
              <div className="space-y-2">
                <Label>Estado actual</Label>
                <div className="space-y-1 rounded-lg border border-border p-3">
                  {PAINT_STATUSES.map((status) => {
                    const active = formStatuses.includes(status.type);
                    const currentStep = getCurrentPaintStep(formStatuses);
                    const isCurrent = currentStep?.type === status.type;
                    return (
                      <button
                        key={status.type}
                        type="button"
                        onClick={() => selectFormStep(status.type)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all ${
                          isCurrent
                            ? "bg-primary/15 text-foreground font-semibold"
                            : active
                              ? "bg-primary/5 text-foreground/80"
                              : "text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                            isCurrent ? "border-primary bg-primary" : active ? "border-primary/50 bg-primary/20" : "border-muted-foreground/30"
                          }`}
                        >
                          {active && <Check className={`h-3 w-3 ${isCurrent ? "text-primary-foreground" : "text-primary"}`} />}
                        </div>
                        {status.name}
                        {isCurrent && <span className="ml-auto text-xs text-primary">Actual</span>}
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
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
            <DialogFooter className="mt-2 shrink-0 gap-2">
              <Button
                variant="outline"
                className="h-11 w-full sm:h-9 sm:w-auto"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="h-11 w-full sm:h-9 sm:w-auto"
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
