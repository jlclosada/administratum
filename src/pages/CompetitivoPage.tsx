import { FeaturedListCard } from "@/components/competitive/cards";
import { ListBrowser } from "@/components/competitive/ListBrowser";
import { ShareListDialog } from "@/components/community/ShareListDialog";
import { PlayTournamentCard, PlayTournamentRow } from "@/components/play/PlayBits";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getCommunityLists, getFeaturedLists, getMyFriendlyGames, getMyPlayingTournaments, getPlayTournaments, getProfilesByIds, getTournaments } from "@/db";
import { formatSummary, registrationOpen } from "@/lib/play/labels";
import type { FriendlyGame, PlayEntry, PlayTournament } from "@/lib/play/types";
import { SEO_COMPETITIVO } from "@/lib/seoCopy";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useAuthStore } from "@/stores";
import type { CommunityList, FeaturedList, Profile } from "@/types";
import { ArrowRight, CalendarDays, Dices, Grid3x3, Plus, ScrollText, Star, Swords, Trophy } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function ToolCard({ to, icon: Icon, title, text, cta, highlight }: { to: string; icon: ComponentType<{ className?: string }>; title: string; text: string; cta: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={
        "group flex h-full flex-col rounded-3xl border p-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 " +
        (highlight ? "border-primary/40 bg-brand-soft hover:border-primary/70" : "border-border/60 bg-card/40 hover:border-primary/40")
      }
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

/**
 * Competitivo: the hub for competitive play — organise a tournament, the
 * tournaments you play in, team matrices, the calendar and the meta lists.
 */
export function CompetitivoPage() {
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [communityLists, setCommunityLists] = useState<CommunityList[]>([]);
  const [authors, setAuthors] = useState<Map<string, Profile>>(new Map());
  const [listsLoading, setListsLoading] = useState(true);
  const [hosted, setHosted] = useState<PlayTournament[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [mine, setMine] = useState<{ tournament: PlayTournament; entry: PlayEntry }[]>([]);
  const [games, setGames] = useState<FriendlyGame[]>([]);
  const [publishing, setPublishing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getFeaturedLists().then(setLists);
    getCommunityLists(200)
      .then(async (l) => {
        setCommunityLists(l);
        setAuthors(await getProfilesByIds(l.map((x) => x.userId)));
      })
      .finally(() => setListsLoading(false));
    getPlayTournaments().then(setHosted);
    getTournaments().then((t) => setUpcomingCount(t.filter((x) => x.status !== "finished").length));
  }, []);

  useEffect(() => {
    if (user) {
      getMyPlayingTournaments().then(setMine).catch(() => setMine([]));
      getMyFriendlyGames().then(setGames);
    } else {
      setMine([]);
      setGames([]);
    }
  }, [user]);

  // "/competitivo#listas" (back links from list pages) lands on the lists.
  useEffect(() => {
    if (location.hash !== "#listas" || listsLoading) return;
    document.getElementById("listas")?.scrollIntoView({ block: "start" });
  }, [listsLoading, location.hash]);

  const open = hosted.filter((t) => registrationOpen(t)).slice(0, 3);
  const active = mine.filter(({ tournament: t }) => t.status !== "finished" && t.status !== "cancelled");

  return (
    <PageTransition>
      <Seo {...SEO_COMPETITIVO} path="/competitivo" />
      <div className="space-y-12">
        <header className="relative isolate overflow-hidden rounded-3xl border border-border/50 bg-card/30 px-6 py-10 sm:px-10 sm:py-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <img src="/images/landing-hero.jpg" alt="" className="h-full w-full object-cover opacity-20 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
          </div>
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> Escena competitiva
          </p>
          <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">Competitivo</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Organiza tu torneo, inscríbete con tu equipo, prepara las matrices y lleva cada partida ronda a ronda.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="gradient" size="lg" className="gap-2">
              <Link to="/competitivo/partida/nueva">
                <Dices className="h-4 w-4" /> Nueva partida
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/competitivo/organizar">
                <Plus className="h-4 w-4" /> Organizar torneo o liga
              </Link>
            </Button>
            {games.length > 0 && (
              <Button asChild variant="ghost" size="lg">
                <Link to="/competitivo/partidas">Mis partidas ({games.length})</Link>
              </Button>
            )}
          </div>
        </header>

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-2xl font-black tracking-tight">Tus torneos</h2>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {active.map(({ tournament: t, entry }) => (
                <li key={t.id}>
                  <PlayTournamentRow t={t} extra={<span className="text-xs text-muted-foreground">{t.teamSize > 1 ? entry.name : formatSummary(t)}</span>} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <ToolCard to="/competitivo/organizar" icon={Plus} title="Organizar torneo o liga" text="Para tiendas y clubes: torneos y ligas con inscripciones, pagos, listas, emparejamientos y resultados en directo." cta="Crear o gestionar" />
          <ToolCard
            to="/competitivo/partida/nueva"
            icon={Dices}
            title="Nueva partida"
            text="Una partida 1 contra 1 con todo lo necesario: ejércitos, listas, misiones de 11ª edición y puntuación ronda a ronda. Queda en tu historial."
            cta="Empezar partida"
            highlight
          />
          <ToolCard to="/competitivo/torneos" icon={CalendarDays} title="Calendario de torneos" text={`Torneos en España${upcomingCount ? `: ${upcomingCount} próximos` : ""}, y los que tienen inscripción en Administratum.`} cta="Ver calendario" />
          <ToolCard to="/competitivo/matrices" icon={Grid3x3} title="Matrices de equipo" text="Puntúa cada cruce del 1 al 5 y obtén defensor, atacantes y emparejamiento ideal." cta="Hacer una matriz" />
          <ToolCard to="/competitivo#listas" icon={ScrollText} title="Listas del meta" text="Listas destacadas y de la comunidad, con su facción, destacamento y resultado." cta="Ver listas" />
        </section>

        {open.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
              <h2 className="font-display text-2xl font-black tracking-tight">Inscripción abierta</h2>
              <Link to="/competitivo/torneos" className="inline-flex items-center gap-1 text-sm text-primary">
                Todos los torneos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {open.map((t, i) => (
                <PlayTournamentCard key={t.id} t={t} index={i} />
              ))}
            </div>
          </section>
        )}

        <section id="listas" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <ScrollText className="h-3 w-3" /> Meta
              </p>
              <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
                Listas
              </h2>
            </div>
            <Button
              className="gap-2"
              onClick={requireAuth(
                () => setPublishing(true),
                "publicar tus listas",
              )}
            >
              <Plus className="h-4 w-4" /> Publicar lista
            </Button>
          </div>

          {lists.length > 0 && (
            <div className="mb-8 space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />{" "}
                Destacadas por la organización
              </h3>
              <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
                {lists.map((l, i) => (
                  <div
                    key={l.id}
                    className="w-[min(20rem,85vw)] shrink-0 snap-start"
                  >
                    <FeaturedListCard l={l} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <ListBrowser
            lists={communityLists}
            authors={authors}
            loading={listsLoading}
          />
        </section>

        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/catalogo-puntos">
              <Swords className="h-4 w-4" /> Consultar puntos del Munitorum
            </Link>
          </Button>
        </div>
      </div>
      {publishing && (
        <ShareListDialog
          onClose={() => setPublishing(false)}
          onShared={(list) => {
            setPublishing(false);
            navigate(`/comunidad/listas/${list.id}`);
          }}
        />
      )}
    </PageTransition>
  );
}
