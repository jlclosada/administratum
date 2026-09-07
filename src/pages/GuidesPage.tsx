import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { getGuides, guideRating } from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { GuideSort, PaintingGuide } from "@/types";
import { PRESET_GAMES } from "@/types";
import { motion } from "framer-motion";
import { BookOpen, Clock, Palette, Plus, Search, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function GuidesPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id);
  const [guides, setGuides] = useState<PaintingGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<GuideSort>("top");
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGuides({
        search: debounced,
        sort,
        gameName: gameFilter,
        userId: mineOnly ? userId : undefined,
      });
      setGuides(data);
    } catch (err) {
      console.error("Failed to load guides:", err);
    } finally {
      setLoading(false);
    }
  }, [debounced, sort, gameFilter, mineOnly, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              <span className="text-gradient animate-gradient">
                Guías de pintura
              </span>
            </h1>
            <p className="text-muted-foreground">
              Tutoriales publicados por la comunidad. Aprende y comparte.
            </p>
          </div>
          <Button
            variant="gradient"
            className="gap-2"
            onClick={() => navigate("/guias/nueva")}
          >
            <Plus className="h-4 w-4" />
            Publicar guía
          </Button>
        </div>

        {/* Search + controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, ejército o palabra clave..."
              className="h-11 w-full rounded-xl border border-input bg-background/40 pl-11 pr-10 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort */}
            <div className="inline-flex rounded-xl border border-border/60 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setSort("top")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  sort === "top"
                    ? "bg-brand-gradient text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Star className="h-3.5 w-3.5" />
                Mejor valoradas
              </button>
              <button
                type="button"
                onClick={() => setSort("recent")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  sort === "recent"
                    ? "bg-brand-gradient text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                Recientes
              </button>
            </div>

            {/* Mine */}
            {userId && (
              <button
                type="button"
                onClick={() => setMineOnly((v) => !v)}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-sm font-medium transition-all",
                  mineOnly
                    ? "border-transparent bg-brand-soft text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                Mis guías
              </button>
            )}
          </div>

          {/* Game filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGameFilter(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                gameFilter === null
                  ? "border-transparent bg-brand-gradient text-white"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              )}
            >
              Todos
            </button>
            {PRESET_GAMES.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setGameFilter(g.name)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  gameFilter === g.name
                    ? "border-transparent bg-brand-gradient text-white"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <LoadingSpinner size="lg" text="Cargando guías..." />
          </div>
        ) : guides.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="No hay guías todavía"
            description={
              mineOnly
                ? "Aún no has publicado ninguna guía. ¡Comparte tu primer tutorial!"
                : "Sé el primero en publicar una guía de pintura para la comunidad."
            }
            action={{
              label: "Publicar guía",
              onClick: () => navigate("/guias/nueva"),
            }}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                type="button"
                onClick={() => navigate(`/guias/${g.id}`)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-xl"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                  {g.coverImage ? (
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Palette className="h-10 w-10 text-primary/25" />
                    </div>
                  )}
                  {!g.published && (
                    <span className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                      Borrador
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="line-clamp-2 font-semibold text-foreground">
                    {g.title}
                  </h3>
                  {g.summary && (
                    <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                      {g.summary}
                    </p>
                  )}
                  {g.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <span className="truncate text-xs text-muted-foreground">
                      por {g.authorName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StarRating value={guideRating(g)} size="sm" readOnly />
                      <span className="text-xs text-muted-foreground">
                        {g.ratingCount > 0 ? guideRating(g).toFixed(1) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
