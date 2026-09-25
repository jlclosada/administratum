import { PhotoViewer } from "@/components/community/PhotoViewer";
import { SharePhotoDialog } from "@/components/community/SharePhotoDialog";
import { usePhotoFeed } from "@/components/community/usePhotoFeed";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { StarRating } from "@/components/shared/StarRating";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { FriendButton } from "@/components/social/FriendButton";
import { Button } from "@/components/ui/button";
import {
  getFriendshipWith,
  getGuides,
  getProfile,
  getProfileStats,
  getSharedPhotosByUser,
  guideRating,
} from "@/db";
import { isAdminEmail } from "@/lib/admin";
import { linkLabel, profileLinks } from "@/lib/profileLinks";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import type { Friendship, PaintingGuide, Profile, ProfileStats } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Crown,
  Grid3x3,
  Heart,
  Link2,
  MapPin,
  MessageCircle,
  Palette,
  Plus,
  Settings,
  ShieldCheck,
  Swords,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

type Tab = "photos" | "guides";

export function ProfilePage() {
  const { userId: routeId } = useParams<{ userId: string }>();
  const me = useAuthStore((s) => s.user);
  if (!routeId) return me ? <Navigate to={`/perfil/${me.id}`} replace /> : null;
  // Remount per user so every piece of state resets when navigating between profiles.
  return <ProfileView key={routeId} userId={routeId} />;
}

function ProfileView({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const myId = me?.id;
  const isMe = myId === userId;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ friends: 0, photos: 0, guides: 0 });
  const [guides, setGuides] = useState<PaintingGuide[]>([]);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("photos");
  const [viewer, setViewer] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);

  const loadPhotos = useCallback(() => getSharedPhotosByUser(userId), [userId]);
  const feed = usePhotoFeed(loadPhotos);

  useEffect(() => {
    Promise.all([
      getProfile(userId),
      getProfileStats(userId),
      getGuides({ userId }),
      myId && !isMe ? getFriendshipWith(userId) : Promise.resolve(null),
    ])
      .then(([p, s, g, f]) => {
        setProfile(p);
        setStats(s);
        setGuides(g.filter((guide) => guide.published || isMe));
        setFriendship(f);
      })
      .finally(() => setLoading(false));
  }, [userId, myId, isMe]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando perfil..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon={<UserRound className="h-8 w-8" />}
        title="Perfil no encontrado"
        description="Puede que la cuenta se haya eliminado."
        action={{ label: "Ir a Comunidad", onClick: () => navigate("/comunidad") }}
      />
    );
  }

  const name = profile.displayName || "Sin nombre";
  const links = profileLinks(profile);
  const isSuperadmin = isMe && isAdminEmail(me?.email);
  const friends = friendship?.status === "accepted";
  const cover = feed.photos[0]?.image;

  function handleFriendshipChange(next: Friendship | null) {
    const wasFriends = friendship?.status === "accepted";
    const isFriends = next?.status === "accepted";
    if (wasFriends !== isFriends) {
      setStats((s) => ({ ...s, friends: s.friends + (isFriends ? 1 : -1) }));
    }
    setFriendship(next);
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-border/50">
          <div className="relative h-32 overflow-hidden sm:h-44">
            {cover ? (
              <motion.img
                src={cover}
                alt=""
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                className="h-full w-full object-cover blur-md"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/30 via-card to-rose-500/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>

          <div className="relative -mt-16 px-5 pb-6 sm:-mt-20 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", bounce: 0.45, duration: 0.8 }}
                className="w-fit rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-500 p-[3px] shadow-2xl"
              >
                <span className="block rounded-full bg-background p-1">
                  <UserAvatar src={profile.avatarUrl} name={name} size="xl" />
                </span>
              </motion.div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
                  {isSuperadmin ? (
                    <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                      <Crown className="h-3 w-3" /> Superadmin
                    </span>
                  ) : (
                    profile.role === "admin" && (
                      <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {isMe ? (
                    <>
                      <Button variant="outline" className="gap-2" onClick={() => navigate("/settings")}>
                        <Settings className="h-4 w-4" /> Editar perfil
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => navigate("/mensajes")}>
                        <MessageCircle className="h-4 w-4" /> Mensajes
                      </Button>
                    </>
                  ) : (
                    me && (
                      <>
                        <FriendButton
                          userId={userId}
                          myId={me.id}
                          friendship={friendship}
                          onChange={handleFriendshipChange}
                        />
                        {friends && (
                          <Button variant="outline" className="gap-2" onClick={() => navigate(`/mensajes/${userId}`)}>
                            <MessageCircle className="h-4 w-4" /> Mensaje
                          </Button>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>
            </div>

            <dl className="mt-6 grid max-w-md grid-cols-3 gap-2 text-center sm:text-left">
              {[
                { label: "Publicaciones", value: stats.photos },
                { label: "Guías", value: stats.guides },
                { label: "Amigos", value: stats.friends },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="font-display text-xl font-bold tabular-nums">
                    <AnimatedNumber value={s.value} />
                  </dd>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>

            <div className="mt-5 max-w-2xl space-y-3">
              {profile.bio ? (
                <p className="whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p>
              ) : (
                isMe && (
                  <p className="text-sm text-muted-foreground">
                    Aún no tienes biografía.{" "}
                    <Link to="/settings" className="text-primary hover:underline">
                      Añade una
                    </Link>
                    .
                  </p>
                )
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </span>
                )}
                {profile.favoriteFaction && (
                  <span className="flex items-center gap-1.5">
                    <Swords className="h-3.5 w-3.5" /> {profile.favoriteFaction}
                  </span>
                )}
              </div>
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium transition-[border-color,color,transform] hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                    >
                      <Link2 className="h-3.5 w-3.5 transition-transform group-hover:-rotate-12" />
                      {linkLabel(link)}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex justify-center gap-8 border-b border-border/60" role="tablist">
          {(
            [
              { id: "photos", label: "Publicaciones", icon: Grid3x3 },
              { id: "guides", label: "Guías", icon: Palette },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 pb-3 text-xs font-bold uppercase tracking-widest transition-colors",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="profile-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "photos" ? (
              feed.loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : feed.photos.length === 0 && !isMe ? (
                <EmptyState
                  icon={<Camera className="h-8 w-8" />}
                  title="Sin publicaciones"
                  description={`${name} todavía no ha compartido fotos.`}
                />
              ) : (
                <div className="grid grid-cols-3 gap-1 sm:gap-3">
                  {isMe && (
                    <button
                      type="button"
                      onClick={() => setShowShare(true)}
                      className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:rounded-xl"
                    >
                      <Plus className="h-7 w-7 transition-transform duration-300 group-hover:rotate-90" />
                      <span className="text-xs font-medium">Compartir</span>
                    </button>
                  )}
                  {feed.photos.map((p, i) => (
                    <motion.button
                      key={p.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i, 12) * 0.03 }}
                      onClick={() => setViewer(i)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted sm:rounded-xl"
                    >
                      <img
                        src={p.image}
                        alt={p.caption}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Heart className="h-4 w-4 fill-white" /> {p.likeCount}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )
            ) : guides.length === 0 ? (
              <EmptyState
                icon={<Palette className="h-8 w-8" />}
                title="Sin guías publicadas"
                description={isMe ? "Comparte tu técnica con una guía de pintura." : `${name} todavía no ha publicado guías.`}
                action={isMe ? { label: "Escribir guía", onClick: () => navigate("/guias/nueva") } : undefined}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {guides.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/guias/${g.id}`}
                      className="group flex gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-3 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {g.coverImage ? (
                          <img src={g.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Palette className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 py-1">
                        <p className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">{g.title}</p>
                        {!g.published && <span className="text-[11px] text-amber-500">Borrador</span>}
                        <div className="mt-2">
                          <StarRating value={guideRating(g)} size="sm" readOnly />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showShare && (
        <SharePhotoDialog
          onClose={() => setShowShare(false)}
          onShared={(photo) => {
            feed.prepend(photo, profile);
            setStats((s) => ({ ...s, photos: s.photos + 1 }));
            setShowShare(false);
          }}
        />
      )}

      <PhotoViewer
        photos={feed.photos}
        index={viewer}
        authors={new Map([[profile.id, profile]])}
        currentUserId={me?.id}
        onIndexChange={setViewer}
        onClose={() => setViewer(null)}
        onLike={feed.toggle}
        onDelete={(photo) => {
          setViewer(null);
          feed.remove(photo);
          setStats((s) => ({ ...s, photos: Math.max(0, s.photos - 1) }));
        }}
      />
    </PageTransition>
  );
}
