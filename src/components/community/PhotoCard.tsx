import { UserAvatar } from "@/components/shared/UserAvatar";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Profile, SharedPhoto } from "@/types";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Heart } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";

/**
 * Masonry tile for a shared photo. Mouse users get a cursor spotlight, a
 * slight 3D tilt and a hover-revealed caption; touch users see the caption
 * bar permanently (no hover on touch). Double-click/tap likes, Instagram-style.
 */
export function PhotoCard({
  photo,
  author,
  index,
  canLike,
  onOpen,
  onLike,
  showAuthor = true,
}: {
  photo: SharedPhoto;
  author: Profile | undefined;
  index: number;
  canLike: boolean;
  onOpen: () => void;
  onLike: () => void;
  showAuthor?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState(0);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [5, -5]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-5, 5]), { stiffness: 200, damping: 20 });

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x);
    py.set(y);
    ref.current.style.setProperty("--mx", `${x * 100}%`);
    ref.current.style.setProperty("--my", `${y * 100}%`);
  }

  function handleLeave() {
    px.set(0.5);
    py.set(0.5);
  }

  function handleDoubleClick() {
    if (!canLike) return;
    setBurst((n) => n + 1);
    if (!photo.likedByMe) onLike();
  }

  const name = author?.displayName || photo.authorName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.06, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm transition-[border-color,box-shadow] duration-300 [@media(hover:hover)]:hover:border-primary/40 [@media(hover:hover)]:hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.45)]"
      >
        <button
          type="button"
          onClick={onOpen}
          onDoubleClick={handleDoubleClick}
          className="block w-full text-left"
          aria-label={photo.caption || `Foto de ${name}`}
        >
          <img
            src={photo.image}
            alt={photo.caption}
            loading="lazy"
            className="w-full object-cover transition-transform duration-700 ease-out [@media(hover:hover)]:group-hover:scale-[1.06]"
          />
          {/* Cursor-following sheen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.35), transparent 45%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
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

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 transition-all duration-300",
            "[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
          )}
        >
          <div className="min-w-0">
            {photo.caption && (
              <p className="line-clamp-2 text-sm font-medium leading-snug text-white drop-shadow">{photo.caption}</p>
            )}
            {showAuthor ? (
              <Link
                to={`/perfil/${photo.userId}`}
                className="pointer-events-auto mt-1.5 flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
              >
                <UserAvatar src={author?.avatarUrl} name={name} size="xs" className="ring-1 ring-white/40" />
                <span className="truncate">{name}</span>
                <span className="text-white/50">· {timeAgo(photo.createdAt)}</span>
              </Link>
            ) : (
              <span className="mt-1 block text-xs text-white/60">{timeAgo(photo.createdAt)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onLike}
            disabled={!canLike}
            aria-pressed={!!photo.likedByMe}
            aria-label={photo.likedByMe ? "Quitar me gusta" : "Me gusta"}
            className="pointer-events-auto flex shrink-0 items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur transition-transform active:scale-90 disabled:opacity-60"
          >
            <motion.span
              key={photo.likedByMe ? "on" : "off"}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.4 }}
              className="flex"
            >
              <Heart className={cn("h-3.5 w-3.5", photo.likedByMe && "fill-rose-500 text-rose-500")} />
            </motion.span>
            <span className="tabular-nums">{photo.likeCount}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
