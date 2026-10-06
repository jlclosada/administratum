import { CommunityListCard } from "@/components/community/CommunityListCard";
import { PhotoCard } from "@/components/community/PhotoCard";
import { PhotoViewer } from "@/components/community/PhotoViewer";
import { ShareListDialog } from "@/components/community/ShareListDialog";
import { SharePhotoDialog } from "@/components/community/SharePhotoDialog";
import { usePhotoFeed } from "@/components/community/usePhotoFeed";
import { HomeLeftRail } from "@/components/home/HomeLeftRail";
import {
  GuidesWidget,
  NewsWidget,
  PointsWidget,
  SpotlightCard,
  TournamentsWidget,
} from "@/components/home/HomeWidgets";
import { countdownLabel, parseDay } from "@/components/competitive/status";
import { PageTransition } from "@/components/shared/PageTransition";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  getArticles,
  getCommunityLists,
  getCurrentMiniatureSpotlight,
  getGuides,
  getProfilesByIds,
  getRecentUpdates,
  getSharedPhotos,
  getTournaments,
} from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useAuthStore, useProfileStore } from "@/stores";
import type {
  Article,
  CatalogUpdate,
  CommunityList,
  MiniatureSpotlight,
  PaintingGuide,
  Profile,
  SharedPhoto,
  Tournament,
} from "@/types";
import { motion } from "framer-motion";
import { Brush, Camera, Loader2, Newspaper, Plus, ScrollText, Sparkles, Star, Target, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

const PAGE = 12;

type FeedItem = { kind: "photo"; at: string; photo: SharedPhoto } | { kind: "list"; at: string; list: CommunityList };

// ---------------------------------------------------------------------------
// Composer: "¿Qué estás pintando?"
// ---------------------------------------------------------------------------

function Composer({ onPhoto, onList }: { onPhoto: () => void; onList: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const name =
    profile?.displayName || (user?.user_metadata?.display_name as string | undefined) || "";
  const first = name.split(" ")[0];
  const actions: { label: string; icon: typeof Camera; onClick: () => void }[] = [
    { label: "Foto", icon: Camera, onClick: onPhoto },
    { label: "Lista", icon: ScrollText, onClick: onList },
    { label: "Guía", icon: Brush, onClick: () => navigate("/guias/nueva") },
  ];
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <UserAvatar src={profile?.avatarUrl} name={name} />
        <button
          type="button"
          onClick={onPhoto}
          className="h-11 flex-1 truncate rounded-full border border-border/60 bg-background/40 px-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {first ? `¿Qué estás pintando, ${first}?` : "¿Qué estás pintando?"}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/50 pt-3">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            className="flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <a.icon className="h-4 w-4 text-primary" />
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// "Hoy": swipeable highlights where the side rails don't fit
// ---------------------------------------------------------------------------

function TodayCard({ to, icon: Icon, eyebrow, title, meta, image }: {
  to: string;
  icon: typeof Star;
  eyebrow: string;
  title: string;
  meta?: string;
  image?: string | null;
}) {
  return (
    <Link
      to={to}
      className="group relative flex h-32 w-60 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-3"
    >
      {image && (
        <>
          <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      )}
      <span className="relative flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">
        <Icon className="h-3 w-3" />
        {eyebrow}
      </span>
      <span className={cn("relative mt-1 line-clamp-2 text-sm font-semibold leading-snug", image ? "text-white" : "")}>{title}</span>
      {meta && <span className={cn("relative text-[11px]", image ? "text-white/65" : "text-muted-foreground")}>{meta}</span>}
    </Link>
  );
}

function TodayStrip({
  spotlight,
  tournament,
  updates,
  article,
}: {
  spotlight: MiniatureSpotlight | null;
  tournament: Tournament | undefined;
  updates: CatalogUpdate[];
  article: Article | undefined;
}) {
  const points = updates.filter((u) => u.type === "points");
  const latestPoints = points[0];
  const cards: ReactNode[] = [];
  if (spotlight)
    cards.push(<TodayCard key="s" to="/comunidad" icon={Star} eyebrow="Miniatura del mes" title={spotlight.title} meta={spotlight.painterName ?? undefined} image={spotlight.image} />);
  if (tournament)
    cards.push(
      <TodayCard
        key="t"
        to={`/competitivo/torneos/${tournament.id}`}
        icon={Trophy}
        eyebrow="Próximo torneo"
        title={tournament.name}
        meta={[tournament.location, countdownLabel(tournament)].filter(Boolean).join(" · ")}
        image={tournament.coverImage}
      />,
    );
  if (latestPoints)
    cards.push(
      <TodayCard
        key="p"
        to="/cambios-puntos"
        icon={Target}
        eyebrow="Cambios de puntos"
        title={latestPoints.title}
        meta={`${points.length} cambios recientes · ${timeAgo(latestPoints.occurredAt)}`}
      />,
    );
  if (article)
    cards.push(<TodayCard key="a" to={`/articulos/${article.id}`} icon={Newspaper} eyebrow="Noticia" title={article.title} meta={timeAgo(article.createdAt)} image={article.coverImage} />);
  if (cards.length === 0) return null;
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 xl:hidden [&::-webkit-scrollbar]:hidden">
      {cards}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Social home: the community feed in the centre, the user's shortcuts on the
 * left and the rest of the site (news, points, tournaments, guides) on the
 * right — everything at a glance on one screen.
 */
export function HomePage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const user = useAuthStore((s) => s.user);
  const myProfile = useProfileStore((s) => s.profile);

  const [articles, setArticles] = useState<Article[]>([]);
  const [guides, setGuides] = useState<PaintingGuide[]>([]);
  const [updates, setUpdates] = useState<CatalogUpdate[]>([]);
  const [spotlight, setSpotlight] = useState<MiniatureSpotlight | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // Feed: photos (with likes/saves/comments) + community lists, newest first.
  const [photoLimit, setPhotoLimit] = useState(PAGE);
  const loadPhotos = useCallback(() => getSharedPhotos(photoLimit + 1), [photoLimit]);
  const { photos, authors, loading, toggle, toggleSave, setCommentCount, remove, prepend } = usePhotoFeed(loadPhotos);
  const [listLimit, setListLimit] = useState(Math.ceil(PAGE / 2));
  const [lists, setLists] = useState<CommunityList[]>([]);
  const [listAuthors, setListAuthors] = useState<Map<string, Profile>>(new Map());
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [sharePhoto, setSharePhoto] = useState(false);
  const [shareList, setShareList] = useState(false);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    Promise.all([
      getArticles(true),
      getGuides({ sort: "top" }),
      getRecentUpdates("Warhammer 40,000"),
      getCurrentMiniatureSpotlight(),
      getTournaments(),
    ])
      .then(([a, g, u, s, t]) => {
        setArticles(a);
        setGuides(g.slice(0, 3));
        setUpdates(u);
        setSpotlight(s);
        setTournaments(
          t
            .filter((x) => x.status !== "finished" && (parseDay(x.startDate)?.getTime() ?? 0) >= today.getTime())
            .sort((x, y) => (parseDay(x.startDate)?.getTime() ?? 0) - (parseDay(y.startDate)?.getTime() ?? 0)),
        );
      })
      .catch((err) => console.error("Failed to load home rails:", err));
  }, []);

  useEffect(() => {
    getCommunityLists(listLimit + 1).then(async (l) => {
      setLists(l);
      setListAuthors(await getProfilesByIds(l.map((x) => x.userId)));
    });
  }, [listLimit]);

  const hasMore = photos.length > photoLimit || lists.length > listLimit;
  const feed = useMemo<FeedItem[]>(
    () =>
      [
        ...photos.slice(0, photoLimit).map((photo) => ({ kind: "photo" as const, at: photo.createdAt, photo })),
        ...lists.slice(0, listLimit).map((list) => ({ kind: "list" as const, at: list.createdAt, list })),
      ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [photos, lists, photoLimit, listLimit],
  );
  const feedPhotos = useMemo(() => feed.flatMap((i) => (i.kind === "photo" ? [i.photo] : [])), [feed]);
  const viewerIndex = viewerId ? feedPhotos.findIndex((p) => p.id === viewerId) : -1;

  const rightRail = (
    <>
      <NewsWidget
        articles={articles}
        action={
          isAdmin ? (
            <button
              type="button"
              onClick={() => navigate("/articulos/nuevo")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Nuevo artículo"
              title="Nuevo artículo"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
      <PointsWidget updates={updates} />
      <TournamentsWidget tournaments={tournaments} />
      <GuidesWidget guides={guides} />
    </>
  );

  return (
    <PageTransition>
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        {/* Left rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <HomeLeftRail>{spotlight && <SpotlightCard spotlight={spotlight} />}</HomeLeftRail>
          </div>
        </aside>

        {/* Feed */}
        <section aria-label="Publicaciones de la comunidad" className="mx-auto w-full min-w-0 max-w-[640px] space-y-5">
          <TodayStrip spotlight={spotlight} tournament={tournaments[0]} updates={updates} article={articles[0]} />
          <Composer onPhoto={() => setSharePhoto(true)} onList={() => setShareList(true)} />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border/60" />
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <Sparkles className="h-3 w-3" /> Lo último de la comunidad
            </span>
            <span className="h-px flex-1 bg-border/60" />
          </div>

          {loading && feed.length === 0 ? (
            <div className="space-y-5">
              {[0, 1].map((i) => (
                <div key={i} className="h-[420px] animate-pulse rounded-2xl border border-border/40 bg-card/30" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 px-6 py-16 text-center">
              <Camera className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 font-medium">Todavía no hay publicaciones</p>
              <p className="mt-1 text-sm text-muted-foreground">Sé el primero en compartir tu ejército.</p>
              <Button className="mt-4 gap-2" variant="gradient" onClick={() => setSharePhoto(true)}>
                <Camera className="h-4 w-4" /> Compartir una foto
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {feed.map((item, i) =>
                item.kind === "photo" ? (
                  <PhotoCard
                    key={`p-${item.photo.id}`}
                    photo={item.photo}
                    author={authors.get(item.photo.userId)}
                    index={i}
                    canInteract
                    onOpen={() => setViewerId(item.photo.id)}
                    onLike={() => toggle(item.photo)}
                    onSave={() => toggleSave(item.photo)}
                  />
                ) : (
                  <motion.div
                    key={`l-${item.list.id}`}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                  >
                    <CommunityListCard list={item.list} author={listAuthors.get(item.list.userId)} />
                  </motion.div>
                ),
              )}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={loading}
                    onClick={() => {
                      setPhotoLimit((n) => n + PAGE);
                      setListLimit((n) => n + Math.ceil(PAGE / 2));
                    }}
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cargar más
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Below xl the right rail has no room: its widgets follow the feed. */}
          <div className="space-y-5 xl:hidden">{rightRail}</div>
        </section>

        {/* Right rail */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-5 overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rightRail}
          </div>
        </aside>
      </div>

      {sharePhoto && (
        <SharePhotoDialog
          onClose={() => setSharePhoto(false)}
          onShared={(photo) => {
            prepend(photo, myProfile);
            setSharePhoto(false);
          }}
        />
      )}
      {shareList && (
        <ShareListDialog
          onClose={() => setShareList(false)}
          onShared={(list) => {
            setLists((prev) => [list, ...prev]);
            if (myProfile) setListAuthors((prev) => new Map(prev).set(myProfile.id, myProfile));
            setShareList(false);
          }}
        />
      )}

      <PhotoViewer
        photos={feedPhotos}
        index={viewerIndex >= 0 ? viewerIndex : null}
        authors={authors}
        currentUserId={user?.id}
        onIndexChange={(i) => setViewerId(feedPhotos[i]?.id ?? null)}
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
