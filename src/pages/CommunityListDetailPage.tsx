import { Seo } from "@/components/shared/Seo";
import { seoListTitle } from "@/lib/seoCopy";
import { metaDescription } from "@/lib/site";
import { ShareListDialog } from "@/components/community/ShareListDialog";
import { ArmyListCard } from "@/components/shared/ArmyListNode";
import { CommentSection } from "@/components/shared/CommentSection";
import { EmptyState } from "@/components/shared/EmptyState";
import { LikeButton } from "@/components/shared/LikeButton";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  createFeaturedList,
  deleteCommunityList,
  getCommunityListById,
  getProfile,
  toggleLike,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { formatResult, serializeArmyList } from "@/lib/armyListParser";
import { copyText } from "@/lib/clipboard";
import { timeAgo } from "@/lib/time";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuthStore } from "@/stores";
import type { CommunityList, Profile } from "@/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Loader2,
  MessageCircle,
  Pencil,
  ScrollText,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function CommunityListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const requireAuth = useRequireAuth();
  const isAdmin = useIsAdmin();
  const [list, setList] = useState<CommunityList | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [featuring, setFeaturing] = useState(false);
  const [editing, setEditing] = useState(false);

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
    (count: number) =>
      setList((l) =>
        l && l.commentCount !== count ? { ...l, commentCount: count } : l,
      ),
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
        action={{
          label: "Volver a Comunidad",
          onClick: () => navigate("/comunidad"),
        }}
      />
    );
  }

  const l = list;
  const name = author?.displayName || l.authorName;
  const result = formatResult(l.result);
  const isOwner = me?.id === l.userId;
  const canDelete = isOwner || isAdmin;

  async function handleCopy() {
    try {
      await copyText(serializeArmyList(l.listData));
      toast.success("Lista copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar la lista.");
    }
  }

  async function handleLike() {
    const wasLiked = !!l.likedByMe;
    const apply = (liked: boolean) =>
      setList((x) =>
        x
          ? {
              ...x,
              likedByMe: liked,
              likeCount: Math.max(0, x.likeCount + (liked ? 1 : -1)),
            }
          : x,
      );
    apply(!wasLiked);
    try {
      await toggleLike("list", l.id);
    } catch {
      apply(wasLiked);
      toast.error("No se pudo actualizar el me gusta.");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar esta lista? Esta acción no se puede deshacer."))
      return;
    try {
      await deleteCommunityList(l.id);
      toast.success("Lista eliminada");
      navigate("/competitivo#listas");
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
        action: {
          label: "Ver",
          onClick: () => navigate(`/competitivo/listas/${featured.id}`),
        },
      });
    } catch {
      toast.error("No se pudo destacar la lista.");
    } finally {
      setFeaturing(false);
    }
  }

  return (
    <PageTransition>
      <Seo
        title={seoListTitle(list.title, list.factionName, list.totalPoints)}
        description={metaDescription(list.description)}
        path={`/comunidad/listas/${list.id}`}
      />
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/competitivo#listas")}
          >
            <ArrowLeft className="h-4 w-4" /> Listas
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopy}
            >
              <Copy className="h-3.5 w-3.5" /> Copiar lista
            </Button>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={featuring}
                onClick={handleFeature}
              >
                {featuring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Star className="h-3.5 w-3.5" />
                )}
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
          className="space-y-3"
        >
          <Link
            to={`/perfil/${l.userId}`}
            className="group flex w-fit items-center gap-3"
          >
            <UserAvatar src={author?.avatarUrl} name={name} size="sm" />
            <p className="text-sm leading-tight">
              <span className="font-semibold group-hover:underline">
                {name}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {timeAgo(l.createdAt)}
              </span>
            </p>
          </Link>
          <h1 className="font-display text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {l.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            <span>{l.factionName}</span>
            {l.detachmentName && <span>· {l.detachmentName}</span>}
            <span>· {l.totalPoints} pts</span>
            {l.tournamentName &&
              (l.tournamentId ? (
                <Link
                  to={`/competitivo/torneos/${l.tournamentId}`}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  · <Trophy className="h-3 w-3" /> {l.tournamentName}
                </Link>
              ) : (
                <span className="flex items-center gap-1">
                  · <Trophy className="h-3 w-3" /> {l.tournamentName}
                </span>
              ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <LikeButton
              liked={!!l.likedByMe}
              count={l.likeCount}
              onToggle={requireAuth(handleLike, "dar me gusta")}
            />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> {l.commentCount}
            </span>
            {result && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs text-amber-500">
                <Trophy className="h-3 w-3" /> {result}
              </span>
            )}
          </div>
        </motion.header>

        <ArmyListCard data={l.listData} authorName={name} result={l.result} />

        <section className="rounded-2xl border border-border/60 bg-card/40 p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <UserAvatar src={author?.avatarUrl} name={name} size="xs" />
            Explicación de {name}
          </h2>
          <p className="whitespace-pre-line leading-relaxed text-foreground/90">
            {l.description}
          </p>
        </section>

        <CommentSection
          targetType="list"
          targetId={l.id}
          onCountChange={handleCount}
        />
      </div>
      {editing && (
        <ShareListDialog
          initial={l}
          onClose={() => setEditing(false)}
          onShared={(updated) => {
            setList(updated);
            setEditing(false);
          }}
        />
      )}
    </PageTransition>
  );
}
