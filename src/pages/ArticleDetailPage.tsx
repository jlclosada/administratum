import { CommentSection } from "@/components/shared/CommentSection";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { RichTextRenderer } from "@/components/shared/RichText";
import { Button } from "@/components/ui/button";
import { deleteArticle, getArticleById, getMyLikes, toggleLike } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { useAuthStore } from "@/stores";
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

/** Short, stable reference code derived from the id — reads like a dispatch number. */
function reportCode(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { user } = useAuthStore();
  const [article, setArticle] = useState<Article | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!articleId) return;
    Promise.all([getArticleById(articleId), getMyLikes("article", [articleId])])
      .then(([a, likes]) => {
        setArticle(a);
        setLiked(likes.has(articleId));
      })
      .catch((err) => console.error("Failed to load article:", err))
      .finally(() => setLoading(false));
  }, [articleId]);

  async function handleToggleLike() {
    if (!article) return;
    const was = liked;
    setLiked(!was);
    setArticle((a) => a && { ...a, likeCount: a.likeCount + (was ? -1 : 1) });
    try {
      await toggleLike("article", article.id);
    } catch (err) {
      console.error("Failed to toggle article like:", err);
      setLiked(was);
      setArticle((a) => a && { ...a, likeCount: a.likeCount + (was ? 1 : -1) });
    }
  }

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

        {/* Report frame: sharp corners, a heavy top/bottom rule and a
            monospace dispatch line — the "futuristic bulletin" genre
            treatment, kept to structural chrome so the actual copy stays
            plainly legible. */}
        <div className="border-2 border-foreground/90">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b-2 border-foreground/90 bg-foreground px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-background">
            <span>Transmisión Munitorum · Acceso Público</span>
            <span className="tabular-nums">Ref. {reportCode(article.id)}</span>
          </div>

          <div className="space-y-5 p-5 sm:p-8">
            {article.coverImage && (
              <figure className="border-2 border-foreground/90">
                <img
                  src={article.coverImage}
                  alt={article.title}
                  className="aspect-[21/9] w-full object-cover grayscale-[15%]"
                />
              </figure>
            )}

            <div className="space-y-3">
              {article.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-emerald-600 dark:text-emerald-500">
                  {article.tags.map((t) => (
                    <span key={t}>[{t.toUpperCase()}]</span>
                  ))}
                </div>
              )}
              <h1 className="font-display text-3xl font-black leading-[0.95] tracking-tight sm:text-5xl">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-y border-foreground/20 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span>{formatDate(article.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span>Sector: {article.tags[0] ?? "General"}</span>
                </span>
                <LikeButton
                  liked={liked}
                  count={article.likeCount}
                  onToggle={handleToggleLike}
                  disabled={!user}
                />
              </div>
              {article.excerpt && (
                <p className="text-lg font-medium leading-relaxed text-foreground/90">
                  {article.excerpt}
                </p>
              )}
            </div>

            <RichTextRenderer content={article.content} className="article-report pt-2" />
          </div>

          <div className="border-t-2 border-foreground/90 px-4 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Fin de la transmisión
          </div>
        </div>

        <CommentSection targetType="article" targetId={article.id} />
      </article>
    </PageTransition>
  );
}
