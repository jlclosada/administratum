import { CommentSection } from "@/components/shared/CommentSection";
import { LikeButton } from "@/components/shared/LikeButton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { timeAgo } from "@/lib/time";
import type { Profile, SharedPhoto } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Swords, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function PhotoViewer({
  photos,
  index,
  authors,
  currentUserId,
  onIndexChange,
  onClose,
  onLike,
  onDelete,
}: {
  photos: SharedPhoto[];
  index: number | null;
  authors: Map<string, Profile>;
  currentUserId: string | undefined;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onLike: (photo: SharedPhoto) => void;
  onDelete: (photo: SharedPhoto) => void;
}) {
  const [direction, setDirection] = useState(0);
  const photo = index !== null ? photos[index] : undefined;
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < photos.length - 1;

  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" && index! > 0) {
        setDirection(-1);
        onIndexChange(index! - 1);
      } else if (e.key === "ArrowRight" && index! < photos.length - 1) {
        setDirection(1);
        onIndexChange(index! + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onIndexChange]);

  function go(delta: number) {
    if (index === null) return;
    setDirection(delta);
    onIndexChange(index + delta);
  }

  const author = photo ? authors.get(photo.userId) : undefined;
  const name = author?.displayName || photo?.authorName || "";

  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-5xl gap-0 p-0 sm:p-0 md:grid-cols-[minmax(0,1fr)_360px] md:overflow-hidden">
        <DialogTitle className="sr-only">{photo?.caption || "Foto compartida"}</DialogTitle>
        {photo && (
          <>
            <div className="relative flex min-h-[40vh] items-center justify-center overflow-hidden bg-black md:min-h-[70vh]">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.img
                  key={photo.id}
                  src={photo.image}
                  alt={photo.caption}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -60 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="max-h-[50vh] w-full object-contain md:max-h-[88vh]"
                />
              </AnimatePresence>
              {hasPrev && (
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-[background-color,transform] hover:scale-110 hover:bg-black/70"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-[background-color,transform] hover:scale-110 hover:bg-black/70"
                  aria-label="Foto siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col md:max-h-[92vh]">
              <div className="flex items-center gap-3 border-b border-border/60 p-4 pr-12">
                <Link to={`/perfil/${photo.userId}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar src={author?.avatarUrl} name={name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold hover:text-primary">{name}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(photo.createdAt)}</p>
                  </div>
                </Link>
                {currentUserId === photo.userId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("¿Eliminar esta foto? Esta acción no se puede deshacer.")) onDelete(photo);
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Eliminar foto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-4 p-4 md:overflow-y-auto">
                {photo.caption && <p className="whitespace-pre-line text-sm leading-relaxed">{photo.caption}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <LikeButton
                    liked={!!photo.likedByMe}
                    count={photo.likeCount}
                    onToggle={() => onLike(photo)}
                    disabled={!currentUserId}
                  />
                  {photo.armyName && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
                      <Swords className="h-3 w-3" />
                      {photo.armyName}
                    </span>
                  )}
                </div>
                <CommentSection key={photo.id} targetType="photo" targetId={photo.id} />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
