import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { createArmy, deleteArmy, getArmiesByGame, getArmyPresets, getGameById } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import type { ArmyPreset, ArmyWithStats, Game } from "@/types";
import { PRESET_ARMIES } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    CalendarIcon,
    ImageIcon,
    Plus,
    Shield,
    Swords,
    Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type FactionOption = {
  name: string;
  description: string;
  color: string;
  image: string | null;
};

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [armies, setArmies] = useState<ArmyWithStats[]>([]);
  const [dbPresets, setDbPresets] = useState<ArmyPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<"select" | "custom">("select");
  const [newArmyName, setNewArmyName] = useState("");
  const [newArmyDesc, setNewArmyDesc] = useState("");
  const [newArmyColor, setNewArmyColor] = useState("#8b5cf6");
  const [newArmyImage, setNewArmyImage] = useState<string | null>(null);
  const [newArmyStartDate, setNewArmyStartDate] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!gameId) return;
    try {
      const [gameData, armyData] = await Promise.all([
        getGameById(gameId),
        getArmiesByGame(gameId),
      ]);
      setGame(gameData);
      setArmies(armyData);
      if (gameData) {
        const presets = await getArmyPresets(gameData.name);
        setDbPresets(presets);
      }
    } catch (err) {
      console.error("Failed to load game:", err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handlePickArmyImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (file) {
        const url = await uploadFile(file, "armies");
        setNewArmyImage(url);
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  }

  async function handleCreateArmy() {
    if (!newArmyName.trim() || !gameId) return;
    try {
      const coverImage: string | null = newArmyImage;
      await createArmy({
        gameId,
        name: newArmyName.trim(),
        description: newArmyDesc.trim(),
        colorPrimary: newArmyColor,
        coverImage,
        startDate: newArmyStartDate || null,
      });
      setNewArmyName("");
      setNewArmyDesc("");
      setNewArmyColor("#8b5cf6");
      setNewArmyImage(null);
      setNewArmyStartDate("");
      setShowCreateDialog(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create army:", err);
    }
  }

  async function handleSelectPresetArmy(preset: FactionOption) {
    if (!gameId) return;
    try {
      await createArmy({
        gameId,
        name: preset.name,
        description: preset.description,
        colorPrimary: preset.color,
        coverImage: preset.image,
        startDate: null,
      });
      setShowCreateDialog(false);
      setCreateMode("select");
      await loadData();
    } catch (err) {
      console.error("Failed to create preset army:", err);
    }
  }

  async function handleDeleteArmy(id: string) {
    try {
      await deleteArmy(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete army:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!game) {
    return (
      <EmptyState
        title="Juego no encontrado"
        description="El juego que buscas no existe"
        action={{ label: "Volver", onClick: () => navigate("/games") }}
      />
    );
  }

  const totalMinis = armies.reduce((s, a) => s + a.totalMiniatures, 0);
  const totalPainted = armies.reduce((s, a) => s + a.totalPainted, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-lg">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-background sm:aspect-[3/1]">
            {game.coverImage || game.icon ? (
              <img
                src={(game.coverImage || game.icon) as string}
                alt={game.name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "0";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Swords className="h-24 w-24 text-primary/25" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            {/* Back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/games")}
              className="absolute left-3 top-3 bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl">
                  {game.name}
                </h1>
                {game.description && (
                  <p className="mt-1 max-w-xl text-sm text-white/75">{game.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-white/90">
                  <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                    {armies.length} ejércitos
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                    {totalMinis} miniaturas
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                    {totalPainted} pintadas
                  </span>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateDialog(true)}
                variant="gradient"
                className="gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Nuevo Ejército
              </Button>
            </div>
          </div>
        </div>

        {/* Armies Grid */}
        {armies.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8 text-muted-foreground" />}
            title="Sin ejércitos"
            description="Crea tu primer ejército para empezar a registrar miniaturas"
            action={{ label: "Crear Ejército", onClick: () => setShowCreateDialog(true) }}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence>
              {armies.map((army) => {
                const color = army.colorPrimary ?? "#8b5cf6";
                return (
                <motion.div
                  key={army.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                  layout
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/10"
                    onClick={() =>
                      navigate(`/games/${gameId}/armies/${army.id}`)
                    }
                  >
                    {/* Cover — aspect ratio */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {army.coverImage ? (
                        <>
                          <img
                            src={army.coverImage}
                            alt={army.name}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </>
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${color}40 0%, ${color}15 50%, transparent 100%)`,
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="h-16 w-16" style={{ color: `${color}30` }} />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                      )}
                      {/* Info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="h-3 w-3 rounded-full border-2 border-white/50"
                            style={{ backgroundColor: color }}
                          />
                          <h3 className="font-display text-base font-bold text-white drop-shadow-lg">
                            {army.name}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-white/70">
                            {army.totalMiniatures} miniaturas · {army.totalPainted} pintadas
                          </span>
                          <span className="text-xs font-semibold text-white/90">
                            {army.completionPercentage}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${army.completionPercentage}%`,
                              backgroundColor: army.completionPercentage === 100 ? "#22c55e" : color,
                            }}
                          />
                        </div>
                      </div>
                      {/* Delete */}
                      <div className="absolute right-2 top-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(army.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Army Dialog */}
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) setCreateMode("select");
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Ejército</DialogTitle>
              <DialogDescription>
                {createMode === "select"
                  ? `Elige una facción de ${game.name} o crea una personalizada`
                  : `Crea un ejército personalizado para ${game.name}`}
              </DialogDescription>
            </DialogHeader>

            {createMode === "select" ? (
              (() => {
                const source: FactionOption[] =
                  dbPresets.length > 0
                    ? dbPresets.map((p) => ({
                        name: p.name,
                        description: p.description,
                        color: p.color,
                        image: p.image,
                      }))
                    : (PRESET_ARMIES[game.name] ?? []).map((p) => ({
                        name: p.name,
                        description: p.description,
                        color: p.color,
                        image: null,
                      }));
                const presets = source.filter(
                  (p) => !armies.some((a) => a.name === p.name)
                );
                return (
                  <div className="space-y-4">
                    {presets.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {presets.map((preset) => (
                          <motion.button
                            key={preset.name}
                            type="button"
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSelectPresetArmy(preset)}
                            className="group relative overflow-hidden rounded-xl border border-border/60 text-left transition-all hover:border-primary/50 hover:shadow-lg"
                          >
                            {preset.image ? (
                              <div className="relative aspect-[16/10] w-full overflow-hidden">
                                <img
                                  src={preset.image}
                                  alt={preset.name}
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.opacity = "0";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 p-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
                                      style={{ backgroundColor: preset.color }}
                                    />
                                    <span className="truncate text-sm font-semibold text-white drop-shadow">
                                      {preset.name}
                                    </span>
                                  </div>
                                </div>
                                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition-all group-hover:opacity-100">
                                  <Plus className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            ) : (
                              <div
                                className="relative p-3"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.color}22 0%, transparent 100%)`,
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/30"
                                    style={{ backgroundColor: preset.color }}
                                  />
                                  <span className="truncate text-sm font-semibold">
                                    {preset.name}
                                  </span>
                                </div>
                                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                  {preset.description}
                                </p>
                                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow transition-all group-hover:opacity-100">
                                  <Plus className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setCreateMode("custom")}
                    >
                      <Plus className="h-4 w-4" />
                      Ejército personalizado
                    </Button>
                  </div>
                );
              })()
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="army-name">Nombre</Label>
                    <Input
                      id="army-name"
                      value={newArmyName}
                      onChange={(e) => setNewArmyName(e.target.value)}
                      placeholder="Ej: Mil Hijos, Ultramarines..."
                      onKeyDown={(e) => e.key === "Enter" && handleCreateArmy()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="army-desc">Descripción (opcional)</Label>
                    <Textarea
                      id="army-desc"
                      value={newArmyDesc}
                      onChange={(e) => setNewArmyDesc(e.target.value)}
                      placeholder="Notas del ejército..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="army-color">Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="army-color"
                        value={newArmyColor}
                        onChange={(e) => setNewArmyColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-input bg-transparent"
                      />
                      <span className="text-sm text-muted-foreground">{newArmyColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Imagen (opcional)</Label>
                    <Button variant="outline" className="w-full gap-2" type="button" onClick={handlePickArmyImage}>
                      <ImageIcon className="h-4 w-4" />
                      {newArmyImage ? "Imagen seleccionada" : "Seleccionar imagen"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="army-start-date">Inicio de colección (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="army-start-date"
                        type="date"
                        value={newArmyStartDate}
                        onChange={(e) => setNewArmyStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateMode("select")}>
                    Volver
                  </Button>
                  <Button onClick={handleCreateArmy} disabled={!newArmyName.trim()}>
                    Crear Ejército
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar ejército?</DialogTitle>
              <DialogDescription>
                Se eliminarán todas las miniaturas del ejército. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDeleteArmy(deleteConfirm)}
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
