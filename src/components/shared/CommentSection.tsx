import { LikeButton } from "@/components/shared/LikeButton";
import { Button } from "@/components/ui/button";
import { createComment, deleteComment, getComments, toggleLike } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { useAuthStore } from "@/stores";
import type { Comment, CommentTargetType } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "hace un momento";
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function CommentSection({
  targetType,
  targetId,
}: {
  targetType: CommentTargetType;
  targetId: string;
}) {
  const { user } = useAuthStore();
  const isAdmin = useIsAdmin();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    getComments(targetType, targetId)
      .then(setComments)
      .catch((err) => console.error("Failed to load comments:", err))
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  async function handlePost() {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    try {
      const created = await createComment({ targetType, targetId, content });
      setComments((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error("No se pudo publicar el comentario.");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    try {
      await deleteComment(id);
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error("No se pudo eliminar el comentario.");
      setComments(prev);
    }
  }

  async function handleToggleLike(id: string) {
    const wasLiked = comments.find((c) => c.id === id)?.likedByMe ?? false;
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, likedByMe: !wasLiked, likeCount: c.likeCount + (wasLiked ? -1 : 1) }
          : c,
      ),
    );
    try {
      await toggleLike("comment", id);
    } catch (err) {
      console.error("Failed to toggle comment like:", err);
      setComments((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, likedByMe: wasLiked, likeCount: c.likeCount + (wasLiked ? 1 : -1) }
            : c,
        ),
      );
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="font-semibold">Comentarios</h2>
        {!loading && <span className="text-sm text-muted-foreground">({comments.length})</span>}
      </div>

      {user ? (
        <div className="flex items-start gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un comentario…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background/40 px-3 py-2 text-sm backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            size="icon"
            className="shrink-0"
            disabled={posting || !draft.trim()}
            onClick={handlePost}
            aria-label="Publicar comentario"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-sm text-muted-foreground">
          Inicia sesión para comentar.
        </p>
      )}

      {!loading && comments.length === 0 && (
        <p className="text-sm text-muted-foreground">Sé el primero en comentar.</p>
      )}

      <AnimatePresence initial={false}>
        <div className="divide-y divide-border/50">
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold uppercase text-white">
                {c.authorName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">{c.content}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <LikeButton
                    liked={!!c.likedByMe}
                    count={c.likeCount}
                    onToggle={() => handleToggleLike(c.id)}
                    disabled={!user}
                    size="sm"
                  />
                  {(user?.id === c.userId || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </section>
  );
}
