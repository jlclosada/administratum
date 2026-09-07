import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
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
import { createGame, deleteGame, getAllGames } from "@/db";
import { pickFiles, uploadFile } from "@/lib/storage";
import type { Game } from "@/types";
import { PRESET_GAMES } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ImageIcon, Plus, Swords, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<"select" | "custom">("select");
  const [newGameName, setNewGameName] = useState("");
  const [newGameDesc, setNewGameDesc] = useState("");
  const [newGameImage, setNewGameImage] = useState<string | null>(null);
  const [newGameStartDate, setNewGameStartDate] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    try {
      const data = await getAllGames();
      setGames(data);
    } catch (err) {
      console.error("Failed to load games:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  async function handlePickImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (file) {
        const url = await uploadFile(file, "games");
        setNewGameImage(url);
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
    }
  }

  async function handleSelectPreset(preset: typeof PRESET_GAMES[number]) {
    try {
      await createGame({
        name: preset.name,
        description: preset.description,
        coverImage: null,
        icon: preset.image,
      });
      setShowCreateDialog(false);
      await loadGames();
    } catch (err) {
      console.error("Failed to create preset game:", err);
    }
  }

  async function handleCreateGame() {
    if (!newGameName.trim()) return;
    try {
      await createGame({
        name: newGameName.trim(),
        description: newGameDesc.trim(),
        coverImage: newGameImage,
        startDate: newGameStartDate || null,
      });
      setNewGameName("");
      setNewGameDesc("");
      setNewGameImage(null);
      setNewGameStartDate("");
      setShowCreateDialog(false);
      await loadGames();
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  }

  async function handleDeleteGame(id: string) {
    await deleteGame(id);
    setDeleteConfirm(null);
    await loadGames();
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando juegos..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              <span className="text-gradient animate-gradient">Sistemas de Juego</span>
            </h1>
            <p className="text-muted-foreground">Gestiona tus colecciones por sistema de juego</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} variant="gradient" className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Nuevo Juego
          </Button>
        </div>

        {/* Games Grid */}
        {games.length === 0 ? (
          <EmptyState
            icon={<Swords className="h-8 w-8 text-muted-foreground" />}
            title="No hay juegos"
            description="Comienza creando tu primer sistema de juego"
            action={{ label: "Crear Juego", onClick: () => setShowCreateDialog(true) }}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.07 } },
            }}
            className="grid gap-6 sm:grid-cols-2"
          >
            <AnimatePresence>
              {games.map((game) => (
                <motion.div
                  key={game.id}
                  variants={{
                    hidden: { opacity: 0, y: 24, scale: 0.96 },
                    show: { opacity: 1, y: 0, scale: 1 },
                  }}
                  layout
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="group relative"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/games/${game.id}`)}
                    className="shimmer relative block w-full overflow-hidden rounded-2xl border border-border/60 text-left shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/5 to-background">
                      {game.coverImage || game.icon ? (
                        <img
                          src={(game.coverImage || game.icon) as string}
                          alt={game.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = "0";
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Swords className="h-20 w-20 text-primary/25" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      {/* Content */}
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <h3 className="font-display text-xl font-bold text-white drop-shadow-lg">
                          {game.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-white/75">
                          {game.description || "Sin descripción"}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 opacity-0 transition-all duration-300 group-hover:opacity-100">
                          Ver colección
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </button>
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(game.id);
                    }}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-destructive group-hover:opacity-100"
                    aria-label="Eliminar juego"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Dialog */}
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) setCreateMode("select");
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nuevo Sistema de Juego</DialogTitle>
              <DialogDescription>
                {createMode === "select"
                  ? "Selecciona un juego o crea uno personalizado"
                  : "Configura tu juego personalizado"}
              </DialogDescription>
            </DialogHeader>

            {createMode === "select" ? (
              <div className="space-y-4">
                {/* Preset Games */}
                <div className="grid grid-cols-2 gap-4">
                  {PRESET_GAMES.filter(
                    (p) => !games.some((g) => g.name === p.name)
                  ).map((preset) => (
                    <motion.button
                      key={preset.name}
                      type="button"
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectPreset(preset)}
                      className="group relative overflow-hidden rounded-2xl border border-border/60 text-left shadow-md transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                        <img
                          src={preset.image}
                          alt={preset.name}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = "0";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3">
                          <span className="block font-display text-sm font-bold text-white drop-shadow">
                            {preset.name}
                          </span>
                          <span className="mt-0.5 block line-clamp-1 text-[10px] text-white/70">
                            {preset.description}
                          </span>
                        </div>
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all group-hover:opacity-100">
                          <Plus className="h-4 w-4" />
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Custom option */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setCreateMode("custom")}
                >
                  <Plus className="h-4 w-4" />
                  Juego personalizado
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="game-name">Nombre</Label>
                    <Input
                      id="game-name"
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      placeholder="Ej: Kill Team, The Old World..."
                      onKeyDown={(e) => e.key === "Enter" && handleCreateGame()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="game-desc">Descripción (opcional)</Label>
                    <Textarea
                      id="game-desc"
                      value={newGameDesc}
                      onChange={(e) => setNewGameDesc(e.target.value)}
                      placeholder="Breve descripción del juego..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Imagen (opcional)</Label>
                    {newGameImage ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border">
                        <img
                          src={newGameImage}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setNewGameImage(null)}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePickImage}
                        className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
                      >
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm font-medium">Seleccionar imagen</span>
                        <span className="text-xs text-muted-foreground">
                          Se recomienda formato horizontal
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="game-start-date">Fecha de inicio (opcional)</Label>
                    <Input
                      id="game-start-date"
                      type="date"
                      value={newGameStartDate}
                      onChange={(e) => setNewGameStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateMode("select")}>
                    Volver
                  </Button>
                  <Button onClick={handleCreateGame} disabled={!newGameName.trim()}>
                    Crear Juego
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar juego?</DialogTitle>
              <DialogDescription>
                Se eliminarán todos los ejércitos y miniaturas asociados. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDeleteGame(deleteConfirm)}
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
