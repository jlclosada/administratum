import { UserAvatar } from "@/components/shared/UserAvatar";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Profile, SharedPhoto } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, MessageCircle, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { likesLabel } from "./format";

/** Heart / comment / bookmark row shared by the feed card and the viewer. */
export function PostActions({
  photo,
  canInteract,
  onLike,
  onComment,
  onSave,
  size = "md",
}: {
  photo: SharedPhoto;
  canInteract: boolean;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  size?: "md" | "lg";
}) {
  const icon = size === "lg" ? "h-6 w-6" : "h-[22px] w-[22px]";
  const btn =
    "rounded-full p-1.5 -m-1.5 transition-[color,transform] hover:text-muted-foreground active:scale-90 disabled:opacity-50";
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={onLike}
        disabled={!canInteract}
        aria-pressed={!!photo.likedByMe}
        aria-label={photo.likedByMe ? "Quitar me gusta" : "Me gusta"}
        className={btn}
      >
        <motion.span
          key={photo.likedByMe ? "on" : "off"}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.6, duration: 0.45 }}
          className="flex"
        >
          <Heart className={cn(icon, photo.likedByMe && "fill-rose-500 text-rose-500")} />
        </motion.span>
      </button>
      <button type="button" onClick={onComment} aria-label="Comentarios" className={btn}>
        <MessageCircle className={cn(icon, "-scale-x-100")} />
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!canInteract}
        aria-pressed={!!photo.savedByMe}
        aria-label={photo.savedByMe ? "Quitar de guardados" : "Guardar"}
        className={cn(btn, "ml-auto")}
      >
        <motion.span
          key={photo.savedByMe ? "on" : "off"}
          initial={{ scale: 0.6, y: -3 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.45 }}
          className="flex"
        >
          <Bookmark className={cn(icon, photo.savedByMe && "fill-current")} />
        </motion.span>
      </button>
    </div>
  );
}

/**
 * Instagram-style post: author on top, image, actions, likes, title and
 * description — all visible without hovering. Double-click the image to like.
 */
export function PhotoCard({
  photo,
  author,
  index,
  canInteract,
  onOpen,
  onLike,
  onSave,
}: {
  photo: SharedPhoto;
  author: Profile | undefined;
  index: number;
  canInteract: boolean;
  onOpen: () => void;
  onLike: () => void;
  onSave: () => void;
}) {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [burst, setBurst] = useState(0);
  const name = author?.displayName || photo.authorName;

  useEffect(
    () => () => {
      if (clickTimer.current) clearTimeout(clickTimer.current);
    },
    [],
  );

  // A double-click also fires two clicks: wait briefly before opening so a
  // double-click only likes, like double-tap on Instagram.
  function handleClick() {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onOpen();
    }, 220);
  }

  function handleDoubleClick() {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    if (!canInteract) return;
    setBurst((n) => n + 1);
    if (!photo.likedByMe) onLike();
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.07, ease: [0.23, 1, 0.32, 1] }}
      className="group overflow-hidden rounded-2xl border border-border/50 bg-card/50 transition-[border-color,box-shadow,transform] duration-300 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-border [@media(hover:hover)]:hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]"
    >
      <header className="flex items-center gap-2.5 px-3.5 py-3">
        <Link to={`/perfil/${photo.userId}`} className="shrink-0 rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/60">
          <UserAvatar src={author?.avatarUrl} name={name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1 leading-tight">
          <Link to={`/perfil/${photo.userId}`} className="block truncate text-sm font-semibold hover:underline">
            {name}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(photo.createdAt)}</span>
        </div>
        {photo.armyName && (
          <span className="flex max-w-[45%] items-center gap-1 truncate rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            <Swords className="h-3 w-3 shrink-0" />
            <span className="truncate">{photo.armyName}</span>
          </span>
        )}
      </header>

      <div className="relative overflow-hidden bg-black">
        <button
          type="button"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className="block w-full"
          aria-label={`Abrir publicación de ${name}`}
        >
          <img
            src={photo.image}
            alt={photo.title || photo.caption}
            loading="lazy"
            className="max-h-[560px] w-full object-cover transition-transform duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.03]"
          />
        </button>
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              aria-hidden
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.25, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, times: [0, 0.35, 1] }}
              onAnimationComplete={() => setBurst(0)}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Heart className="h-20 w-20 fill-white text-white drop-shadow-[0_4px_18px_rgba(244,63,94,0.8)]" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1.5 px-3.5 pb-3.5 pt-3">
        <PostActions photo={photo} canInteract={canInteract} onLike={onLike} onComment={onOpen} onSave={onSave} />
        <p className="text-sm font-semibold tabular-nums">{likesLabel(photo.likeCount)}</p>
        {photo.title && <h3 className="font-display text-base font-bold leading-snug">{photo.title}</h3>}
        {photo.caption && (
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground/85">
            <Link to={`/perfil/${photo.userId}`} className="mr-1.5 font-semibold hover:underline">
              {name}
            </Link>
            {photo.caption}
          </p>
        )}
        {photo.commentCount > 0 && (
          <button type="button" onClick={onOpen} className="text-sm text-muted-foreground hover:text-foreground">
            {photo.commentCount === 1 ? "Ver 1 comentario" : `Ver los ${photo.commentCount} comentarios`}
          </button>
        )}
      </div>
    </motion.article>
  );
}
