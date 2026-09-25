import { TournamentAdmin } from "@/components/competitive/TournamentAdmin";
import { ResultInputs } from "@/components/shared/ArmyListDialog";
import { ArmyListPasteField } from "@/components/shared/ArmyListPasteField";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    createFeaturedList,
    deleteFeaturedList,
    getFeaturedLists,
    getTournaments,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { buildResult, formatResult, type ParsedArmyList } from "@/lib/armyListParser";
import { pickFiles, uploadFile } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { FeaturedList, Tournament } from "@/types";
import { ArrowLeft, ExternalLink, ImageIcon, Loader2, ScrollText, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AdminCompetitivePage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [lTitle, setLTitle] = useState("");
  const [lFaction, setLFaction] = useState("");
  const [lPoints, setLPoints] = useState("");
  const [lAuthor, setLAuthor] = useState("");
  const [lDesc, setLDesc] = useState("");
  const [lImage, setLImage] = useState<string | null>(null);
  const [lUploading, setLUploading] = useState(false);
  const [lSaving, setLSaving] = useState(false);
  const [lRaw, setLRaw] = useState("");
  const [lParsed, setLParsed] = useState<ParsedArmyList | null>(null);
  const [lTournament, setLTournament] = useState("");
  const [lResult, setLResult] = useState({ victories: "", defeats: "", draws: "" });

  // Pre-fill the metadata fields from a freshly parsed list, without
  // overwriting anything the admin already typed.
  const handleListParsed = useCallback((list: ParsedArmyList | null) => {
    setLParsed(list);
    if (!list) return;
    setLTitle((v) => v || list.listName);
    setLFaction((v) => v || list.factionName);
    setLPoints((v) => v || String(list.totalPoints));
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    Promise.all([getTournaments(false), getFeaturedLists(false)])
      .then(([t, l]) => {
        setTournaments(t);
        setLists(l);
      })
      .catch((err) => console.error("Failed to load competitive data:", err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  async function handlePickListImage() {
    try {
      const [file] = await pickFiles({ accept: "image/*" });
      if (!file) return;
      setLUploading(true);
      setLImage(await uploadFile(file, "featured-lists"));
    } catch (err) {
      console.error("Failed to upload list image:", err);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setLUploading(false);
    }
  }

  async function handleCreateList() {
    if (!lTitle.trim()) return;
    setLSaving(true);
    try {
      const created = await createFeaturedList({
        title: lTitle.trim(),
        factionName: lFaction.trim() || null,
        totalPoints: lPoints.trim() ? Number(lPoints) : null,
        authorName: lAuthor.trim(),
        description: lDesc.trim(),
        coverImage: lImage,
        listData: lParsed,
        tournamentName: lTournament.trim() || null,
        result: buildResult(lResult.victories, lResult.defeats, lResult.draws),
      });
      setLists((prev) => [created, ...prev]);
      setLTitle("");
      setLFaction("");
      setLPoints("");
      setLAuthor("");
      setLDesc("");
      setLImage(null);
      setLRaw("");
      setLParsed(null);
      setLTournament("");
      setLResult({ victories: "", defeats: "", draws: "" });
      toast.success("Lista destacada añadida");
    } catch (err) {
      console.error("Failed to create featured list:", err);
      toast.error("No se pudo añadir la lista.");
    } finally {
      setLSaving(false);
    }
  }

  async function handleDeleteList(id: string) {
    try {
      await deleteFeaturedList(id);
      setLists((prev) => prev.filter((l) => l.id !== id));
      toast.success("Lista eliminada");
    } catch (err) {
      console.error("Failed to delete featured list:", err);
      toast.error("No se pudo eliminar la lista.");
    }
  }

  if (!isAdmin) {
    return (
      <PageTransition>
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold">Acceso restringido</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </PageTransition>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Volver a Administración"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Competitivo
            </h1>
            <p className="text-muted-foreground">Torneos y listas destacadas</p>
          </div>
        </div>

        <TournamentAdmin tournaments={tournaments} onChange={setTournaments} />

        {/* Featured lists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-primary" />
              Listas destacadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lists.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-border/60">
                {lists.map((l, i) => (
                  <div
                    key={l.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3",
                      i !== 0 && "border-t border-t-border/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/competitivo/listas/${l.id}`)}
                      className="group min-w-0 flex-1 text-left"
                    >
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium group-hover:text-primary">
                        {l.title}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          l.factionName,
                          l.totalPoints ? `${l.totalPoints} pts` : null,
                          l.authorName,
                          formatResult(l.result),
                          l.listData ? null : "sin lista pegada",
                        ].filter(Boolean).join(" · ") || "Sin detalles"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(l.id)}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar lista"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Pega la lista exportada (NewRecruit / app oficial) — rellena título, facción y puntos
              </label>
              <ArmyListPasteField value={lRaw} onChange={setLRaw} onParsed={handleListParsed} rows={6} />
            </div>

            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handlePickListImage}
                disabled={lUploading}
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
              >
                {lUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : lImage ? (
                  <img src={lImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6" />
                )}
              </button>
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input value={lTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="Título de la lista" />
                <Input value={lFaction} onChange={(e) => setLFaction(e.target.value)} placeholder="Facción (opcional)" />
                <Input type="number" value={lPoints} onChange={(e) => setLPoints(e.target.value)} placeholder="Puntos totales" />
                <Input value={lAuthor} onChange={(e) => setLAuthor(e.target.value)} placeholder="Autor" />
                <Input
                  value={lTournament}
                  onChange={(e) => setLTournament(e.target.value)}
                  placeholder="Torneo (opcional)"
                  className="sm:col-span-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Resultado en torneo — V-D-E (opcional)
              </label>
              <ResultInputs
                {...lResult}
                onChange={(field, value) => setLResult((r) => ({ ...r, [field]: value }))}
              />
            </div>
            <Textarea value={lDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Estrategia, resultados, por qué destaca…" rows={2} />
            <Button onClick={handleCreateList} disabled={lSaving || !lTitle.trim()} className="gap-2">
              <ScrollText className="h-4 w-4" />
              {lSaving ? "Añadiendo..." : "Añadir lista destacada"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
