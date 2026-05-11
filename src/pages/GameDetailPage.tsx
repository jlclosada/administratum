import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
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
import { createArmy, deleteArmy, getArmiesByGame, getGameById, saveImageToAppData } from "@/db";
import type { ArmyWithStats, Game } from "@/types";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    CalendarIcon,
    ChevronRight,
    ImageIcon,
    Plus,
    Shield,
    Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [armies, setArmies] = useState<ArmyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      const file = await open({
        multiple: false,
        filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      });
      if (file) setNewArmyImage(file);
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  }

  async function handleCreateArmy() {
    if (!newArmyName.trim() || !gameId) return;
    try {
      let coverImage: string | null = null;
      if (newArmyImage) {
        coverImage = await saveImageToAppData(newArmyImage, "armies");
      }
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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/games")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{game.name}</h1>
              <p className="text-muted-foreground">{game.description}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{armies.length} ejércitos</span>
                <span>{totalMinis} miniaturas</span>
                <span>{totalPainted} pintadas</span>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Ejército
          </Button>
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
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {armies.map((army) => (
                <motion.div
                  key={army.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                    onClick={() =>
                      navigate(`/games/${gameId}/armies/${army.id}`)
                    }
                  >
                    {army.coverImage ? (
                      <div className="h-28 overflow-hidden">
                        <img
                          src={convertFileSrc(army.coverImage)}
                          alt={army.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-2"
                        style={{ backgroundColor: army.colorPrimary ?? "#8b5cf6" }}
                      />
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: `${army.colorPrimary ?? "#8b5cf6"}20`,
                            }}
                          >
                            <Shield
                              className="h-5 w-5"
                              style={{ color: army.colorPrimary ?? "#8b5cf6" }}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold">{army.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {army.totalMiniatures} miniaturas
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(army.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progreso</span>
                          <span>
                            {army.totalPainted}/{army.totalMiniatures} ·{" "}
                            {army.completionPercentage}%
                          </span>
                        </div>
                        <Progress
                          value={army.completionPercentage}
                          className="h-1.5"
                          indicatorClassName={
                            army.completionPercentage === 100
                              ? "bg-green-500"
                              : undefined
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Army Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Ejército</DialogTitle>
              <DialogDescription>
                Crea un ejército para {game.name}
              </DialogDescription>
            </DialogHeader>
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
                  {newArmyImage ? "Imagen seleccionada ✓" : "Seleccionar imagen"}
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
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateArmy} disabled={!newArmyName.trim()}>
                Crear Ejército
              </Button>
            </DialogFooter>
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
