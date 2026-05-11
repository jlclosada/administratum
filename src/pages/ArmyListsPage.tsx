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
    createArmyList,
    deleteArmyList,
    getAllArmies,
    getAllArmyLists,
    getAllGames,
} from "@/db";
import type { ArmyListWithDetails, ArmyWithStats, Game } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
    CalendarIcon,
    ChevronRight,
    ClipboardList,
    Plus,
    Sword,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function ArmyListsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<ArmyListWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formGameId, setFormGameId] = useState("");
  const [formArmyId, setFormArmyId] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Data for selects
  const [games, setGames] = useState<Game[]>([]);
  const [armies, setArmies] = useState<(ArmyWithStats & { gameName: string })[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [l, g, a] = await Promise.all([
        getAllArmyLists(),
        getAllGames(),
        getAllArmies(),
      ]);
      setLists(l);
      setGames(g);
      setArmies(a);
    } catch (err) {
      console.error("Failed to load lists:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setFormName("");
    setFormGameId("");
    setFormArmyId("");
    setFormPoints("");
    setFormDate("");
    setFormNotes("");
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    try {
      await createArmyList({
        name: formName.trim(),
        gameId: formGameId || null,
        armyId: formArmyId || null,
        points: formPoints ? parseInt(formPoints) : 0,
        gameDate: formDate || null,
        notes: formNotes,
      });
      setShowCreate(false);
      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to create list:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteArmyList(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  }

  const filteredArmies = formGameId
    ? armies.filter((a) => a.gameId === formGameId)
    : armies;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando listas..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Mis Listas
            </h1>
            <p className="text-muted-foreground">
              Crea y gestiona tus listas de ejército para partidas
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Lista
          </Button>
        </div>

        {lists.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
            title="Sin listas"
            description="Crea tu primera lista de ejército para planificar partidas"
            action={{
              label: "Crear Lista",
              onClick: () => setShowCreate(true),
            }}
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.06 },
              },
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence>
              {lists.map((list) => (
                <motion.div
                  key={list.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className="group cursor-pointer transition-all hover:border-primary/40 hover:shadow-lg"
                    onClick={() => navigate(`/lists/${list.id}`)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Sword className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">
                              {list.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {list.armyName && (
                                <span className="truncate">
                                  {list.armyName}
                                </span>
                              )}
                              {list.gameName && !list.armyName && (
                                <span className="truncate">
                                  {list.gameName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(list.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {list.points > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {list.points} pts
                          </Badge>
                        )}
                        <span>
                          {list.totalMiniatures} miniaturas
                        </span>
                        {list.gameDate && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(list.gameDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      {list.totalMiniatures > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Pintado</span>
                            <span>
                              {list.paintedMiniatures}/
                              {list.totalMiniatures} ·{" "}
                              {list.completionPercentage}%
                            </span>
                          </div>
                          <Progress
                            value={list.completionPercentage}
                            className="h-1.5"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create Dialog */}
        <Dialog
          open={showCreate}
          onOpenChange={(open) => {
            setShowCreate(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Lista de Ejército</DialogTitle>
              <DialogDescription>
                Crea una lista para planificar tu próxima partida
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la lista</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Lista 2000pts torneo mayo"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Juego</Label>
                  <select
                    value={formGameId}
                    onChange={(e) => {
                      setFormGameId(e.target.value);
                      setFormArmyId("");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">Sin juego</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Ejército</Label>
                  <select
                    value={formArmyId}
                    onChange={(e) => setFormArmyId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">Sin ejército</option>
                    {filteredArmies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puntos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formPoints}
                    onChange={(e) => setFormPoints(e.target.value)}
                    placeholder="Ej: 2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de partida</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Estrategia, objetivos, comentarios..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formName.trim()}>
                Crear Lista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={() => setDeleteConfirm(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar lista?</DialogTitle>
              <DialogDescription>
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
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
