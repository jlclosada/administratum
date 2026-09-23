import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { StarRating } from "@/components/shared/StarRating";
import { Button } from "@/components/ui/button";
import { getArticles, getCurrentMiniatureSpotlight, getGuides, getRecentUpdates, guideRating } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import type { Article, CatalogUpdate, MiniatureSpotlight, PaintingGuide } from "@/types";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Download, Newspaper, Palette, Plus, Star, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return formatDate(iso);
}

/**
 * Reads as a terminal readout — the app's own sync crons (MFM points,
 * downloads) framed as transmission log lines, not another card feed.
 * Kept low-key on purpose: small type, muted phosphor-green accents only
 * on the prompt glyphs, no scanline theatrics.
 */
function UpdatesFeed({ updates }: { updates: CatalogUpdate[] }) {
  const navigate = useNavigate();
  if (updates.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-[#050807]">
      <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-emerald-500/80">
          Registro de transmisiones
        </span>
      </div>
      <div className="divide-y divide-emerald-500/10 font-mono text-xs">
        {updates.map((u) => {
          const Icon = u.type === "points" ? Target : Download;
          return (
            <button
              key={u.id}
              type="button"
              disabled={!u.link}
              onClick={() => u.link && navigate(u.link)}
              className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors enabled:hover:bg-emerald-500/[0.06] disabled:cursor-default"
            >
              <span className="mt-0.5 text-emerald-500/60">&gt;</span>
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/50" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-zinc-300">{u.title}</span>
                <span className="block text-zinc-500">{u.description}</span>
              </span>
              <span className="shrink-0 tabular-nums text-zinc-600">{timeAgo(u.occurredAt)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniatureOfTheMonth({ spotlight }: { spotlight: MiniatureSpotlight | null }) {
  if (!spotlight) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative isolate overflow-hidden rounded-2xl border border-border/60"
    >
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-muted to-background sm:aspect-[3/1]">
        {spotlight.image ? (
          <img src={spotlight.image} alt={spotlight.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Star className="h-14 w-14 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 sm:p-6">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
          <Star className="h-3 w-3 fill-current" />
          Miniatura del mes
        </span>
        <h2 className="font-display text-2xl font-bold text-white drop-shadow-lg sm:text-3xl">
          {spotlight.title}
        </h2>
        <p className="text-sm text-white/70">
          {[spotlight.factionName, spotlight.painterName ? `pintada por ${spotlight.painterName}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {spotlight.description && (
          <p className="mt-1 max-w-2xl text-sm text-white/60">{spotlight.description}</p>
        )}
      </div>
    </motion.div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [articles, setArticles] = useState<Article[]>([]);
  const [guides, setGuides] = useState<PaintingGuide[]>([]);
  const [updates, setUpdates] = useState<CatalogUpdate[]>([]);
  const [spotlight, setSpotlight] = useState<MiniatureSpotlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getArticles(isAdmin ? false : true),
      getGuides({ sort: "top" }),
      getRecentUpdates("Warhammer 40,000"),
      getCurrentMiniatureSpotlight(),
    ])
      .then(([a, g, u, s]) => {
        setArticles(a);
        setGuides(g.slice(0, 3));
        setUpdates(u);
        setSpotlight(s);
      })
      .catch((err) => console.error("Failed to load home content:", err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Inicio
            </h1>
            <p className="text-muted-foreground">
              Últimas noticias y artículos del hobby
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="gradient"
              className="gap-2"
              onClick={() => navigate("/articulos/nuevo")}
            >
              <Plus className="h-4 w-4" />
              Nuevo artículo
            </Button>
          )}
        </div>

        <MiniatureOfTheMonth spotlight={spotlight} />

        <UpdatesFeed updates={updates} />

        {articles.length === 0 ? (
          <EmptyState
            icon={<Newspaper className="h-8 w-8" />}
            title="Aún no hay artículos"
            description={
              isAdmin
                ? "Publica el primer artículo para la comunidad."
                : "Vuelve pronto para leer las últimas novedades."
            }
            action={
              isAdmin
                ? {
                    label: "Crear artículo",
                    onClick: () => navigate("/articulos/nuevo"),
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Featured */}
            {featured && (
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                type="button"
                onClick={() => navigate(`/articulos/${featured.id}`)}
                className="group grid w-full overflow-hidden border-2 border-foreground/90 text-left transition-shadow hover:shadow-2xl md:grid-cols-2"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/20 to-background md:aspect-auto">
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={featured.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center py-16">
                      <Newspaper className="h-14 w-14 text-primary/25" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-2.5 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-emerald-600 dark:text-emerald-500">
                    {!featured.published && <span className="text-amber-500">[BORRADOR]</span>}
                    {featured.tags.slice(0, 3).map((t) => (
                      <span key={t}>[{t.toUpperCase()}]</span>
                    ))}
                  </div>
                  <h2 className="font-display text-2xl font-black leading-[0.95] tracking-tight">
                    {featured.title}
                  </h2>
                  <p className="line-clamp-3 text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {formatDate(featured.createdAt)}
                  </span>
                </div>
              </motion.button>
            )}

            {/* Rest grid */}
            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a, i) => (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    type="button"
                    onClick={() => navigate(`/articulos/${a.id}`)}
                    className="group flex flex-col overflow-hidden border-2 border-foreground/80 text-left transition-shadow hover:shadow-xl"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                      {a.coverImage ? (
                        <img
                          src={a.coverImage}
                          alt={a.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Newspaper className="h-10 w-10 text-primary/25" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      {!a.published && (
                        <span className="w-fit font-mono text-[10px] text-amber-500">[BORRADOR]</span>
                      )}
                      <h3 className="line-clamp-2 font-display font-bold leading-tight text-foreground">
                        {a.title}
                      </h3>
                      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                        {a.excerpt}
                      </p>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Featured guides */}
        {guides.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Guías destacadas
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/guias")}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Ver todas
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {guides.map((g, i) => (
                <motion.button
                  key={g.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  type="button"
                  onClick={() => navigate(`/guias/${g.id}`)}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-background">
                    {g.coverImage ? (
                      <img
                        src={g.coverImage}
                        alt={g.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Palette className="h-10 w-10 text-primary/25" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 font-semibold text-foreground">
                      {g.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        por {g.authorName}
                      </span>
                      <StarRating value={guideRating(g)} size="sm" readOnly />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
