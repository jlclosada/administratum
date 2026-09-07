import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextRenderer } from "@/components/shared/RichText";
import { Button } from "@/components/ui/button";
import { deleteArticle, getArticleById } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import type { Article } from "@/types";
import { ArrowLeft, Newspaper, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!articleId) return;
    getArticleById(articleId)
      .then(setArticle)
      .catch((err) => console.error("Failed to load article:", err))
      .finally(() => setLoading(false));
  }, [articleId]);

  async function handleDelete() {
    if (!article) return;
    if (!confirm("¿Eliminar este artículo? Esta acción no se puede deshacer."))
      return;
    try {
      await deleteArticle(article.id);
      toast.success("Artículo eliminado");
      navigate("/");
    } catch (err) {
      console.error("Failed to delete article:", err);
      toast.error("No se pudo eliminar el artículo.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando artículo..." />
      </div>
    );
  }

  if (!article) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-md py-24 text-center">
          <Newspaper className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h1 className="font-display text-2xl font-bold">
            Artículo no encontrado
          </h1>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Button>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/articulos/${article.id}/editar`)}
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            </div>
          )}
        </div>

        {article.coverImage && (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <img
              src={article.coverImage}
              alt={article.title}
              className="aspect-[21/9] w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {t}
              </span>
            ))}
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
            {article.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(article.createdAt)}
          </p>
          {article.excerpt && (
            <p className="text-lg text-muted-foreground">{article.excerpt}</p>
          )}
        </div>

        <RichTextRenderer content={article.content} className="pt-2" />
      </article>
    </PageTransition>
  );
}
