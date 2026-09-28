import { ArmyListCard } from "@/components/shared/ArmyListNode";
import { CommentSection } from "@/components/shared/CommentSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { createFeaturedList, deleteCommunityList, getCommunityListById, getProfile, toggleLike } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { formatResult } from "@/lib/armyListParser";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores";
import type { CommunityList, Profile } from "@/types";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ScrollText, Star, Trash2, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function CommunityListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const [list, setList] = useState<CommunityList | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuring, setFeaturing] = useState(false);

  useEffect(() => {
    if (!listId) return;
    getCommunityListById(listId)
      .then(async (l) => {
        setList(l);
        if (l) setAuthor(await getProfile(l.userId));
      })
      .finally(() => setLoading(false));
  }, [listId]);

  const handleCount = useCallback(
    (count: number) => setList((l) => (l && l.commentCount !== count ? { ...l, commentCount: count } : l)),
    [],
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando lista..." />
      </div>
    );
  }

  if (!list) {
    return (
      <EmptyState
        icon={<ScrollText className="h-8 w-8" />}
        title="Lista no encontrada"
        description="Puede que su autor la haya eliminado."
        action={{ label: "Volver a Comunidad", onClick: () => navigate("/comunidad") }}
      />
    );
  }

  const l = list;
  const name = author?.displayName || l.authorName;
  const result = formatResult(l.result);
  const canDelete = me?.id === l.userId || isAdmin;

  async function handleLike() {
    const wasLiked = !!l.likedByMe;
    const apply = (liked: boolean) =>
      setList((x) => (x ? { ...x, likedByMe: liked, likeCount: Math.max(0, x.likeCount + (liked ? 1 : -1)) } : x));
    apply(!wasLiked);
    try {
      await toggleLike("list", l.id);
    } catch {
      apply(wasLiked);
      toast.error("No se pudo actualizar el me gusta.");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta lista? Esta acción no se puede deshacer.")) return;
    try {
      await deleteCommunityList(l.id);
      toast.success("Lista eliminada");
      navigate("/comunidad?tab=listas");
    } catch {
      toast.error("No se pudo eliminar la lista.");
    }
  }

  async function handleFeature() {
    setFeaturing(true);
    try {
      const featured = await createFeaturedList({
        title: l.title,
        factionName: l.factionName,
        totalPoints: l.totalPoints,
        authorName: name,
        description: l.description,
        listData: l.listData,
        result: l.result,
      });
      toast.success("Añadida a las listas destacadas de Competitivo", {
        action: { label: "Ver", onClick: () => navigate(`/competitivo/listas/${featured.id}`) },
      });
    } catch {
      toast.error("No se pudo destacar la lista.");
    } finally {
      setFeaturing(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/comunidad?tab=listas")}>
            <ArrowLeft className="h-4 w-4" /> Comunidad
          </Button>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-2" disabled={featuring} onClick={handleFeature}>
                {featuring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
                Destacar en Competitivo
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            )}
          </div>
        </div>

        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-4 rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7"
        >
          <Link to={`/perfil/${l.userId}`} className="group flex w-fit items-center gap-3">
            <UserAvatar src={author?.avatarUrl} name={name} />
            <div className="leading-tight">
              <p className="text-sm font-semibold group-hover:underline">{name}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</p>
            </div>
          </Link>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {[l.factionName, l.detachmentName, `${l.totalPoints} pts`].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">{l.title}</h1>
          </div>
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">{l.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <LikeButton liked={!!l.likedByMe} count={l.likeCount} onToggle={handleLike} disabled={!me} />
            {result && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs text-amber-500">
                <Trophy className="h-3 w-3" /> {result}
              </span>
            )}
          </div>
        </motion.header>

        <ArmyListCard data={l.listData} authorName={name} result={l.result} />

        <CommentSection targetType="list" targetId={l.id} onCountChange={handleCount} />
      </div>
    </PageTransition>
  );
}
