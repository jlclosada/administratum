import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { getArticles } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import type { Article } from "@/types";
import { motion } from "framer-motion";
import { Newspaper, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArticles(isAdmin ? false : true)
      .then(setArticles)
      .catch((err) => console.error("Failed to load articles:", err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando noticias..." />
      </div>
    );
  }

  const [featured, ...rest] = articles;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              <span className="text-gradient animate-gradient">Inicio</span>
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
                className="group grid w-full overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-2xl md:grid-cols-2"
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
                <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    {!featured.published && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-500">
                        Borrador
                      </span>
                    )}
                    {featured.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="font-display text-2xl font-bold leading-tight tracking-tight">
                    {featured.title}
                  </h2>
                  <p className="line-clamp-3 text-muted-foreground">
                    {featured.excerpt}
                  </p>
                  <span className="text-xs text-muted-foreground">
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
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 text-left transition-all hover:border-primary/40 hover:shadow-xl"
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
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      {!a.published && (
                        <span className="w-fit rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                          Borrador
                        </span>
                      )}
                      <h3 className="line-clamp-2 font-semibold text-foreground">
                        {a.title}
                      </h3>
                      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                        {a.excerpt}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
