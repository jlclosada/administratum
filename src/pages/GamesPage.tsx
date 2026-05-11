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
import { Textarea } from "@/components/ui/textarea";
import { createGame, deleteGame, getAllGames, saveImageToAppData } from "@/db";
import type { Game } from "@/types";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, ChevronRight, ImageIcon, Plus, Swords, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      });
      if (selected) {
        const savedPath = await saveImageToAppData(selected as string, "games");
        setNewGameImage(savedPath);
      }
    } catch (err) {
      console.error("Failed to pick image:", err);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Sistemas de Juego</h1>
            <p className="text-muted-foreground">Gestiona tus colecciones por sistema de juego</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
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
              show: { opacity: 1, transition: { staggerChildren: 0.06 } },
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {games.map((game) => (
                <motion.div
                  key={game.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95 },
                    show: { opacity: 1, scale: 1 },
                  }}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => navigate(`/games/${game.id}`)}
                  >
                    {/* Cover */}
                    <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent overflow-hidden">
                      {game.coverImage ? (
                        <img
                          src={convertFileSrc(game.coverImage)}
                          alt={game.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Swords className="h-12 w-12 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute right-2 top-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-background/80 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(game.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{game.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {game.description || "Sin descripción"}
                          </p>
                          {game.startDate && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              Desde {new Date(game.startDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Sistema de Juego</DialogTitle>
              <DialogDescription>
                Añade un nuevo juego para organizar tus miniaturas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="game-name">Nombre</Label>
                <Input
                  id="game-name"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  placeholder="Ej: Warhammer 40,000"
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
                <Label>Imagen / Icono (opcional)</Label>
                <div className="flex items-center gap-3">
                  {newGameImage ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                      <img
                        src={convertFileSrc(newGameImage)}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setNewGameImage(null)}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={handlePickImage} className="gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Seleccionar imagen
                    </Button>
                  )}
                </div>
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
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGame} disabled={!newGameName.trim()}>
                Crear Juego
              </Button>
            </DialogFooter>
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
