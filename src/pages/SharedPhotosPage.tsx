import { PhotoCard } from "@/components/community/PhotoCard";
import { PhotoViewer } from "@/components/community/PhotoViewer";
import { SharePhotoDialog } from "@/components/community/SharePhotoDialog";
import { usePhotoFeed } from "@/components/community/usePhotoFeed";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { getSharedPhotos } from "@/db";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type { SharedPhoto } from "@/types";
import { motion } from "framer-motion";
import { Camera, Flame, Plus, Search, Sparkles, UserPlus, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Sort = "recent" | "popular";

const SORTS: { id: Sort; label: string; icon: typeof Sparkles }[] = [
  { id: "recent", label: "Recientes", icon: Sparkles },
  { id: "popular", label: "Populares", icon: Flame },
];

const HEADLINE = ["Colecciones", "que", "merecen", "ser", "vistas"];

function SkeletonGrid() {
  const heights = [220, 300, 260, 340, 240, 280, 320, 230];
  return (
    <div className="columns-1 gap-5 sm:columns-2 2xl:columns-3 [&>*]:mb-5">
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40"
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
      ))}
    </div>
  );
}

export function SharedPhotosPage() {
  const { user } = useAuthStore();
  const myProfile = useProfileStore((s) => s.profile);
  const load = useCallback(() => getSharedPhotos(), []);
  const { photos, authors, loading, toggle, toggleSave, setCommentCount, remove, prepend } = usePhotoFeed(load);
  const [showShare, setShowShare] = useState(false);
  const [sort, setSort] = useState<Sort>("recent");
  const [query, setQuery] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? photos.filter((p) =>
          [p.title, p.caption, p.armyName, authors.get(p.userId)?.displayName ?? p.authorName]
            .filter(Boolean)
            .some((t) => t!.toLowerCase().includes(q)),
        )
      : photos;
    return sort === "popular"
      ? [...filtered].sort((a, b) => b.likeCount - a.likeCount)
      : filtered;
  }, [photos, authors, query, sort]);

  // "Stories"-style row of the painters with the most likes on their photos.
  const topPainters = useMemo(() => {
    const byUser = new Map<string, { likes: number; photos: number; latest: SharedPhoto }>();
    for (const p of photos) {
      const e = byUser.get(p.userId) ?? { likes: 0, photos: 0, latest: p };
      e.likes += p.likeCount;
      e.photos += 1;
      byUser.set(p.userId, e);
    }
    return [...byUser.entries()]
      .sort((a, b) => b[1].likes - a[1].likes || b[1].photos - a[1].photos)
      .slice(0, 12);
  }, [photos]);

  const totalLikes = photos.reduce((n, p) => n + p.likeCount, 0);
  const viewerIndex = viewerId ? visible.findIndex((p) => p.id === viewerId) : -1;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 px-6 py-10 sm:px-10 sm:py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
            {photos.slice(0, 6).map((p, i) => (
              <motion.img
                key={p.id}
                src={p.image}
                alt=""
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={{ opacity: 0.18, y: 0, rotate: (i % 2 ? 1 : -1) * (4 + i) }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
                className="absolute hidden h-40 w-32 rounded-xl object-cover shadow-2xl lg:block"
                style={{ right: `${4 + (i % 3) * 11}%`, top: `${8 + Math.floor(i / 3) * 44}%` }}
              />
            ))}
          </div>

          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> Comunidad
            </p>
            <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">
              {HEADLINE.map((word, i) => (
                <span key={word + i} className="inline-block overflow-hidden pb-1 align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                  >
                    {word}&nbsp;
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-4 max-w-lg text-muted-foreground"
            >
              Ejércitos terminados, proyectos a medias y esquemas de color de otros coleccionistas.
              Doble clic en una foto para darle me gusta y guarda las que quieras consultar después.
            </motion.p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {user && (
                <Button variant="gradient" className="gap-2" onClick={() => setShowShare(true)}>
                  <Plus className="h-4 w-4" />
                  Compartir foto
                </Button>
              )}
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/amigos">
                  <UserPlus className="h-4 w-4" />
                  Encontrar pintores
                </Link>
              </Button>
            </div>

            <dl className="mt-8 flex gap-8">
              {[
                { label: "fotos", value: photos.length },
                { label: "pintores", value: new Set(photos.map((p) => p.userId)).size },
                { label: "me gusta", value: totalLikes },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-2xl font-bold tabular-nums sm:text-3xl">
                    <AnimatedNumber value={s.value} />
                  </dd>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Top painters */}
        {topPainters.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" /> Pintores destacados
            </h2>
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {topPainters.map(([userId, stat], i) => {
                const profile = authors.get(userId);
                const name = profile?.displayName || stat.latest.authorName;
                return (
                  <motion.div
                    key={userId}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, type: "spring", bounce: 0.4 }}
                  >
                    <Link
                      to={`/perfil/${userId}`}
                      className="group flex w-20 flex-col items-center gap-1.5 text-center"
                    >
                      <span className="rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-500 p-[2px] transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                        <span className="block rounded-full bg-background p-[2px]">
                          <UserAvatar src={profile?.avatarUrl} name={name} size="lg" />
                        </span>
                      </span>
                      <span className="w-full truncate text-xs font-medium group-hover:text-primary">{name}</span>
                      <span className="text-[10px] text-muted-foreground">{stat.likes} ♥</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Toolbar */}
        <div className="sticky top-16 z-20 -mx-4 flex flex-col gap-3 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:flex-row sm:items-center sm:rounded-2xl sm:border sm:px-3">
          <div className="relative flex rounded-full border border-border/60 p-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  sort === s.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {sort === s.id && (
                  <motion.span
                    layoutId="community-sort"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ejército, pintor o descripción…"
              className="h-9 w-full rounded-full border border-border/60 bg-transparent pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <motion.div
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/50"
            >
              <Camera className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <p className="font-medium">{query ? "Nada coincide con tu búsqueda" : "Aún no hay fotos compartidas"}</p>
            <p className="text-sm text-muted-foreground">
              {query ? "Prueba con otro término." : "Sé el primero en enseñar tu colección a la comunidad."}
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 2xl:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {visible.map((p, i) => (
              <PhotoCard
                key={p.id}
                photo={p}
                author={authors.get(p.userId)}
                index={i}
                canInteract={!!user}
                onOpen={() => setViewerId(p.id)}
                onLike={() => toggle(p)}
                onSave={() => toggleSave(p)}
              />
            ))}
          </div>
        )}
      </div>

      {showShare && (
        <SharePhotoDialog
          onClose={() => setShowShare(false)}
          onShared={(photo) => {
            prepend(photo, myProfile);
            setShowShare(false);
          }}
        />
      )}

      <PhotoViewer
        photos={visible}
        index={viewerIndex >= 0 ? viewerIndex : null}
        authors={authors}
        currentUserId={user?.id}
        onIndexChange={(i) => setViewerId(visible[i]?.id ?? null)}
        onClose={() => setViewerId(null)}
        onLike={toggle}
        onSave={toggleSave}
        onCommentCount={setCommentCount}
        onDelete={(photo) => {
          setViewerId(null);
          remove(photo);
        }}
      />
    </PageTransition>
  );
}
