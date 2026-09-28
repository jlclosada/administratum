import { AdminShell } from "@/components/shared/AdminShell";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { deleteArticle, getArticles, updateArticle } from "@/db";
import { cn } from "@/lib/utils";
import type { Article } from "@/types";
import { Eye, EyeOff, Heart, Newspaper, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import type { AdminOutletContext } from "./AdminLayout";

type Filter = "all" | "published" | "drafts";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminArticlesPage() {
  const navigate = useNavigate();
  const { refreshOverview } = useOutletContext<AdminOutletContext>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getArticles(false)
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (filter === "published" && !a.published) return false;
      if (filter === "drafts" && a.published) return false;
      return !q || a.title.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [articles, filter, query]);

  const drafts = articles.filter((a) => !a.published).length;

  async function togglePublished(a: Article) {
    try {
      const updated = await updateArticle({ id: a.id, published: !a.published });
      setArticles((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
      refreshOverview();
      toast.success(updated.published ? "Artículo publicado" : "Movido a borradores");
    } catch {
      toast.error("No se pudo actualizar el artículo.");
    }
  }

  async function handleDelete(a: Article) {
    if (!confirm(`¿Eliminar «${a.title}»? No se puede deshacer.`)) return;
    try {
      await deleteArticle(a.id);
      setArticles((prev) => prev.filter((x) => x.id !== a.id));
      refreshOverview();
      toast.success("Artículo eliminado");
    } catch {
      toast.error("No se pudo eliminar el artículo.");
    }
  }

  return (
    <AdminShell
      title="Artículos"
      subtitle={`${articles.length} artículos · ${drafts} en borrador`}
      actions={
        <Button variant="gradient" className="gap-2" onClick={() => navigate("/articulos/nuevo")}>
          <Plus className="h-4 w-4" /> Nuevo artículo
        </Button>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-full border border-border/60 p-1">
          {(
            [
              ["all", "Todos"],
              ["published", "Publicados"],
              ["drafts", `Borradores${drafts ? ` (${drafts})` : ""}`],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                filter === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título o etiqueta…"
            className="h-9 w-full rounded-full border border-border/60 bg-transparent pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No hay artículos en esta vista.
        </p>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
          {visible.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-4 py-3">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {a.coverImage ? (
                  <img src={a.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Newspaper className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/articulos/${a.id}`} className="truncate font-medium hover:underline">
                    {a.title}
                  </Link>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      a.published ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/15 text-amber-500",
                    )}
                  >
                    {a.published ? "Publicado" : "Borrador"}
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {formatDate(a.createdAt)}
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" /> {a.likeCount}
                  </span>
                  {a.tags.length > 0 && <span className="truncate">· {a.tags.join(", ")}</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => togglePublished(a)}
                  title={a.published ? "Pasar a borrador" : "Publicar"}
                  aria-label={a.published ? "Pasar a borrador" : "Publicar"}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {a.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/articulos/${a.id}/editar`)}
                  aria-label="Editar"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a)}
                  aria-label="Eliminar"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
