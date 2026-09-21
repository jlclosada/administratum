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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  addImageToList,
  addMiniatureToList,
  getAllMiniaturesFlat,
  getArmyListById,
  removeImageFromList,
  removeMiniatureFromList,
  setListMiniatureQuantity,
  updateArmyList,
  updateArmyListPdf,
} from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import { puntosCopias, resumenUnidad } from "@/lib/mfm";
import type {
  ArmyListWithDetails,
  MiniatureWithDetails,
} from "@/types";
import { MINIATURE_CATEGORIES, PAINT_STATUSES } from "@/types";
import {
  ArrowLeft,
  CalendarIcon,
  Check,
  FileText,
  ImageIcon,
  Plus,
  Search,
  Sword,
  Trash2,
  Upload,
  Minus,
  X,
  ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function ArmyListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<ArmyListWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Add miniature dialog
  const [showAddMini, setShowAddMini] = useState(false);
  const [allMiniatures, setAllMiniatures] = useState<
    (MiniatureWithDetails & { armyName: string; gameName: string })[]
  >([]);
  const [miniSearch, setMiniSearch] = useState("");

  // Edit notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!listId) return;
    try {
      const data = await getArmyListById(listId);
      setList(data);
      if (data) setNotesValue(data.notes);
    } catch (err) {
      console.error("Failed to load list:", err);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLoadMiniatures() {
    try {
      const minis = await getAllMiniaturesFlat();
      const scoped = list?.armyId
        ? minis.filter((m) => m.armyId === list.armyId)
        : minis;
      setAllMiniatures(scoped);
      setShowAddMini(true);
    } catch (err) {
      console.error("Failed to load miniatures:", err);
    }
  }

  async function handleSetQuantity(rowId: string, quantity: number) {
    try {
      await setListMiniatureQuantity(rowId, quantity);
      await loadData();
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  }

  async function handleAddMiniature(miniatureId: string) {
    if (!listId) return;
    try {
      await addMiniatureToList(listId, miniatureId, 1);
      await loadData();
    } catch (err) {
      console.error("Failed to add miniature:", err);
    }
  }

  async function handleRemoveMiniature(id: string) {
    try {
      await removeMiniatureFromList(id);
      await loadData();
    } catch (err) {
      console.error("Failed to remove miniature:", err);
    }
  }

  async function handleSaveNotes() {
    if (!listId) return;
    try {
      await updateArmyList(listId, { notes: notesValue });
      setEditingNotes(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  }

  async function handleUploadImage() {
    if (!listId) return;
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      const url = await uploadFile(file, "lists");
      await addImageToList(listId, url, file.name);
      await loadData();
    } catch (err) {
      console.error("Failed to upload image:", err);
    }
  }

  async function handleRemoveImage(imageId: string) {
    try {
      await removeImageFromList(imageId);
      await loadData();
    } catch (err) {
      console.error("Failed to remove image:", err);
    }
  }

  async function handleUploadPdf() {
    if (!listId) return;
    try {
      const [file] = await pickFiles({ accept: "application/pdf,.pdf" });
      if (!file) return;
      const url = await uploadFile(file, "lists/pdfs");
      await updateArmyListPdf(listId, url);
      await loadData();
    } catch (err) {
      console.error("Failed to upload PDF:", err);
    }
  }

  const filteredMiniatures = miniSearch.trim()
    ? allMiniatures.filter(
        (m) =>
          m.name.toLowerCase().includes(miniSearch.toLowerCase()) ||
          m.armyName.toLowerCase().includes(miniSearch.toLowerCase()) ||
          m.gameName.toLowerCase().includes(miniSearch.toLowerCase())
      )
    : allMiniatures;

  // Exclude already added miniatures
  const alreadyAdded = new Set(
    list?.miniatures.map((m) => m.miniatureId) ?? []
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!list) {
    return (
      <EmptyState
        title="Lista no encontrada"
        description="La lista que buscas no existe"
        action={{ label: "Volver", onClick: () => navigate("/lists") }}
      />
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/lists")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {list.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {list.gameName && <span>{list.gameName}</span>}
                {list.armyName && (
                  <>
                    <span>·</span>
                    <span>{list.armyName}</span>
                  </>
                )}
                {list.gameDate && (
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(list.gameDate).toLocaleDateString()}
                  </span>
                )}
                <Badge variant="secondary" className="text-sm font-semibold">
                  {list.points} pts
                </Badge>
              </div>

              {/* Progress */}
              {list.totalMiniatures > 0 && (
                <div className="mt-3 w-full sm:w-80">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progreso de pintado</span>
                    <span>
                      {list.paintedMiniatures}/{list.totalMiniatures} ·{" "}
                      {list.completionPercentage}%
                    </span>
                  </div>
                  <Progress value={list.completionPercentage} className="h-2" />
                </div>
              )}
            </div>
          </div>
          <Button onClick={handleLoadMiniatures} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Añadir Miniatura
          </Button>
        </div>

        {/* Miniatures Table */}
        {list.miniatures.length === 0 ? (
          <EmptyState
            icon={<Sword className="h-8 w-8 text-muted-foreground" />}
            title="Sin miniaturas en la lista"
            description="Añade miniaturas de tu colección a esta lista"
            action={{
              label: "Añadir Miniatura",
              onClick: handleLoadMiniatures,
            }}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60 md:hidden">
                {list.miniatures.map((lm) => {
                  const mini = lm.miniature;
                  if (!mini) return null;
                  const rowPts = puntosCopias(
                    mini.pointsSnapshot ?? [],
                    lm.quantity,
                  );
                  return (
                    <div key={lm.id} className="space-y-2 px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{mini.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {MINIATURE_CATEGORIES.find((c) => c.value === mini.category)?.label ?? mini.category}
                            {rowPts > 0 ? ` · ${rowPts} pts` : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => handleRemoveMiniature(lm.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleSetQuantity(lm.id, lm.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {lm.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleSetQuantity(lm.id, lm.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Miniatura
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Copias
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Puntos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.miniatures.map((lm) => {
                      const mini = lm.miniature;
                      if (!mini) return null;
                      const rowPts = puntosCopias(
                        mini.pointsSnapshot ?? [],
                        lm.quantity,
                      );
                      return (
                        <tr
                          key={lm.id}
                          className="border-b border-border/50 last:border-0 hover:bg-accent/30"
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-sm">
                              {mini.name}
                            </span>
                            {mini.pointsSnapshot?.length ? (
                              <p className="text-[11px] text-muted-foreground">
                                {resumenUnidad({ pricing: mini.pointsSnapshot })}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {MINIATURE_CATEGORIES.find(
                                (c) => c.value === mini.category
                              )?.label ?? mini.category}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleSetQuantity(lm.id, lm.quantity - 1)
                                }
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {lm.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleSetQuantity(lm.id, lm.quantity + 1)
                                }
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
                            {rowPts > 0 ? `${rowPts} pts` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {PAINT_STATUSES.map((status) => {
                                const active = mini.statuses?.includes(
                                  status.type
                                );
                                if (!active) return null;
                                return (
                                  <div
                                    key={status.type}
                                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                    style={{
                                      backgroundColor: `${status.color}20`,
                                      color: status.color,
                                    }}
                                  >
                                    <Check className="h-2.5 w-2.5" />
                                    {status.name}
                                  </div>
                                );
                              })}
                              {(!mini.statuses ||
                                mini.statuses.length === 0) && (
                                <span className="text-xs text-muted-foreground">
                                  Sin estados
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRemoveMiniature(lm.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
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

        {/* Notes */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notas y Comentarios
              </h2>
              {!editingNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNotes(true)}
                >
                  Editar
                </Button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Estrategia, objetivos, composición, cambios..."
                  rows={5}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false);
                      setNotesValue(list.notes);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {list.notes || "Sin notas. Haz click en Editar para añadir."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* PDF */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                PDF de la Lista
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadPdf}
                className="gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                {list.pdfPath ? "Cambiar PDF" : "Subir PDF"}
              </Button>
            </div>
            {list.pdfPath ? (
              <p className="mt-2 text-sm text-muted-foreground">
                PDF adjunto: {list.pdfPath.split("/").pop()}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                No hay PDF adjunto
              </p>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Imágenes de la Lista
              {list.images.length > 0 && (
                <Badge variant="secondary">{list.images.length}</Badge>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadImage}
              className="gap-2"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir Imagen
            </Button>
          </div>
          {list.images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {list.images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border"
                >
                  <img
                    src={img.filePath}
                    alt={img.fileName}
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() =>
                      setLightboxImage(img.filePath)
                    }
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70"
                    onClick={() => handleRemoveImage(img.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No hay imágenes. Sube fotos de tu lista desplegada o de la
              partida.
            </p>
          )}
        </div>

        {/* Lightbox */}
        <Dialog
          open={!!lightboxImage}
          onOpenChange={() => setLightboxImage(null)}
        >
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

        {/* Add Miniature Dialog */}
        <Dialog
          open={showAddMini}
          onOpenChange={(open) => {
            setShowAddMini(open);
            if (!open) setMiniSearch("");
          }}
        >
          <DialogContent className="flex max-h-[80vh] max-w-lg flex-col">
            <DialogHeader>
              <DialogTitle>Añadir Miniatura a la Lista</DialogTitle>
              <DialogDescription>
                Selecciona miniaturas de tu colección
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={miniSearch}
                onChange={(e) => setMiniSearch(e.target.value)}
                placeholder="Buscar por nombre, ejército o juego..."
                className="pl-10"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {filteredMiniatures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No se encontraron miniaturas
                </p>
              ) : (
                filteredMiniatures.map((mini) => {
                  const added = alreadyAdded.has(mini.id);
                  return (
                    <button
                      key={mini.id}
                      type="button"
                      onClick={() => handleAddMiniature(mini.id)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all hover:bg-accent"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{mini.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {mini.gameName} · {mini.armyName} · {mini.quantity}x
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {mini.statuses?.map((s) => {
                          const st = PAINT_STATUSES.find(
                            (ps) => ps.type === s
                          );
                          if (!st) return null;
                          return (
                            <div
                              key={s}
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: st.color }}
                              title={st.name}
                            />
                          );
                        })}
                      </div>
                      {added ? (
                        <Badge variant="secondary" className="text-[10px]">
                          +1 copia
                        </Badge>
                      ) : (
                        <Plus className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-11 w-full sm:h-9 sm:w-auto" onClick={() => setShowAddMini(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
