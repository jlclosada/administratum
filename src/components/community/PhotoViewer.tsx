import { CommentSection } from "@/components/shared/CommentSection";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { timeAgo } from "@/lib/time";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { Profile, SharedPhoto } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Swords, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { likesLabel } from "./format";
import { PostActions } from "./PhotoCard";

function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export function PhotoViewer({
  photos,
  index,
  authors,
  currentUserId,
  onIndexChange,
  onClose,
  onLike,
  onSave,
  onDelete,
  onCommentCount,
}: {
  photos: SharedPhoto[];
  index: number | null;
  authors: Map<string, Profile>;
  currentUserId: string | undefined;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onLike: (photo: SharedPhoto) => void;
  onSave: (photo: SharedPhoto) => void;
  onDelete: (photo: SharedPhoto) => void;
  onCommentCount: (photoId: string, count: number) => void;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [direction, setDirection] = useState(0);
  const commentsRef = useRef<HTMLDivElement>(null);
  const photo = index !== null ? photos[index] : undefined;
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < photos.length - 1;

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      setDirection(delta);
      onIndexChange(index + delta);
    },
    [index, onIndexChange],
  );

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" && hasPrev) go(-1);
      else if (e.key === "ArrowRight" && hasNext) go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, go]);

  const handleCount = useCallback(
    (count: number) => {
      if (photo) onCommentCount(photo.id, count);
    },
    [photo, onCommentCount],
  );

  if (!photo) {
    return <Dialog open={false} />;
  }

  const author = authors.get(photo.userId);
  const name = author?.displayName || photo.authorName;
  const isOwner = currentUserId === photo.userId;

  function focusComment() {
    const input = commentsRef.current?.querySelector("textarea");
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    input?.focus();
  }

  const header = (
    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3 pr-12">
      <Link to={`/perfil/${photo.userId}`} onClick={onClose} className="shrink-0">
        <UserAvatar src={author?.avatarUrl} name={name} size="sm" />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <Link
          to={`/perfil/${photo.userId}`}
          onClick={onClose}
          className="block truncate text-sm font-semibold hover:underline"
        >
          {name}
        </Link>
        {photo.armyName && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Swords className="h-3 w-3" /> {photo.armyName}
          </span>
        )}
      </div>
      {isOwner && (
        <button
          type="button"
          onClick={() => {
            if (confirm("¿Eliminar esta publicación? Esta acción no se puede deshacer.")) onDelete(photo);
          }}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Eliminar publicación"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const description = (photo.title || photo.caption) && (
    <div className="flex gap-3">
      <UserAvatar src={author?.avatarUrl} name={name} size="sm" />
      <div className="min-w-0 text-sm leading-relaxed">
        {photo.title && <p className="font-display text-base font-bold leading-snug">{photo.title}</p>}
        {photo.caption && (
          <p className="whitespace-pre-line text-foreground/90">
            <span className="mr-1.5 font-semibold">{name}</span>
            {photo.caption}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo(photo.createdAt)}</p>
      </div>
    </div>
  );

  const actions = (
    <div className="space-y-1.5 border-t border-border/60 px-4 py-3">
      <PostActions
        photo={photo}
        canInteract={!!currentUserId}
        onLike={() => onLike(photo)}
        onComment={focusComment}
        onSave={() => onSave(photo)}
        size="lg"
      />
      <p className="text-sm font-semibold tabular-nums">{likesLabel(photo.likeCount)}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{fullDate(photo.createdAt)}</p>
    </div>
  );

  const comments = (
    <div ref={commentsRef}>
      <CommentSection
        key={photo.id}
        targetType="photo"
        targetId={photo.id}
        onCountChange={handleCount}
        hideHeading
      />
    </div>
  );

  const image = (
    <div className="relative flex items-center justify-center overflow-hidden bg-black md:min-h-[70vh]">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.img
          key={photo.id}
          src={photo.image}
          alt={photo.title || photo.caption}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="max-h-[60vh] w-full object-contain md:max-h-[88vh]"
        />
      </AnimatePresence>
      {hasPrev && (
        <button
          type="button"
          onClick={() => go(-1)}
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-lg transition-transform hover:scale-110"
          aria-label="Publicación anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={() => go(1)}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-lg transition-transform hover:scale-110"
          aria-label="Publicación siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-5xl gap-0 p-0 sm:p-0 md:grid-cols-[minmax(0,1fr)_380px] md:overflow-hidden">
        <DialogTitle className="sr-only">{photo.title || photo.caption || `Publicación de ${name}`}</DialogTitle>
        {wide ? (
          <>
            {image}
            <div className="flex max-h-[92vh] min-h-0 flex-col">
              {header}
              <div className="flex-1 space-y-5 overflow-y-auto p-4">
                {description}
                {comments}
              </div>
              {actions}
            </div>
          </>
        ) : (
          <div>
            {header}
            {image}
            {actions}
            <div className="space-y-5 p-4 pt-1">
              {description}
              {comments}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
