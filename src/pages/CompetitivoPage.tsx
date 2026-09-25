import { DateBlock, FeaturedListCard, StatusPill, TournamentCard } from "@/components/competitive/cards";
import { countdownLabel, formatDateRange } from "@/components/competitive/status";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Button } from "@/components/ui/button";
import { getFeaturedLists, getTournaments } from "@/db";
import type { FeaturedList, Tournament } from "@/types";
import { motion } from "framer-motion";
import { ArrowRight, History, MapPin, ScrollText, Swords, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

function SectionHeading({ icon, title, kicker }: { icon: ReactNode; title: string; kicker: string }) {
  return (
    <div className="mb-5 border-b border-border/60 pb-3">
      <p className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {icon} {kicker}
      </p>
      <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
    </div>
  );
}

/** The tournament everyone should see first: live now, else the next one. */
function Spotlight({ t }: { t: Tournament }) {
  const countdown = countdownLabel(t);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={`/competitivo/torneos/${t.id}`}
        className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl border border-border/60 p-6 sm:p-8"
      >
        <img
          src={t.coverImage || "/images/landing-hero.jpg"}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" />
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={t.status} />
          {countdown && (
            <span className="rounded-full bg-white px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-950">
              {countdown}
            </span>
          )}
        </div>
        <h3 className="mt-3 max-w-3xl font-display text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl">
          {t.name}
        </h3>
        {t.description && <p className="mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{t.description}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
          <span className="font-mono">{formatDateRange(t)}</span>
          {t.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {t.location}
            </span>
          )}
          {t.pointsLimit && (
            <span className="flex items-center gap-1.5">
              <Swords className="h-4 w-4" /> {t.pointsLimit} pts
            </span>
          )}
          {t.maxPlayers && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {t.maxPlayers} plazas
            </span>
          )}
        </div>
        <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform duration-300 group-hover:translate-x-1">
          Ver bases y detalles <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </motion.div>
  );
}

function EmptyBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function CompetitivoPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [lists, setLists] = useState<FeaturedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTournaments(), getFeaturedLists()])
      .then(([t, l]) => {
        setTournaments(t);
        setLists(l);
      })
      .catch((err) => console.error("Failed to load competitive data:", err))
      .finally(() => setLoading(false));
  }, []);

  const { spotlight, active, finished } = useMemo(() => {
    const byStart = (a: Tournament, b: Tournament) =>
      (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999");
    const ongoing = tournaments.filter((t) => t.status === "ongoing").sort(byStart);
    const upcoming = tournaments.filter((t) => t.status === "upcoming").sort(byStart);
    const done = tournaments
      .filter((t) => t.status === "finished")
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
    const lead = ongoing[0] ?? upcoming[0] ?? null;
    return { spotlight: lead, active: [...ongoing, ...upcoming].filter((t) => t !== lead), finished: done };
  }, [tournaments]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const stats = [
    { label: "torneos activos", value: tournaments.length - finished.length },
    { label: "listas destacadas", value: lists.length },
    { label: "disputados", value: finished.length },
  ];

  return (
    <PageTransition>
      <div className="space-y-14">
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
            Torneos de la comunidad con sus bases completas, y las listas que están marcando el meta.
          </p>
          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-3xl font-bold tabular-nums">
                  <AnimatedNumber value={s.value} />
                </dd>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</dt>
              </div>
            ))}
          </dl>
        </header>

        <section>
          <SectionHeading icon={<Trophy className="h-3 w-3" />} kicker="Calendario" title="Torneos" />
          {!spotlight && finished.length === 0 ? (
            <EmptyBlock
              icon={<Trophy className="h-8 w-8 text-muted-foreground/40" />}
              title="Sin torneos anunciados"
              text="Vuelve pronto: aquí aparecerán los próximos torneos."
            />
          ) : (
            <div className="space-y-6">
              {spotlight && <Spotlight t={spotlight} />}
              {active.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {active.map((t, i) => (
                    <TournamentCard key={t.id} t={t} index={i} />
                  ))}
                </div>
              )}
              {finished.length > 0 && (
                <div className="pt-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <History className="h-4 w-4" /> Historial
                  </h3>
                  <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
                    {finished.map((t) => (
                      <Link
                        key={t.id}
                        to={`/competitivo/torneos/${t.id}`}
                        className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40"
                      >
                        <DateBlock iso={t.startDate} className="w-12 opacity-80" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium group-hover:underline">{t.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[t.location, t.pointsLimit ? `${t.pointsLimit} pts` : null].filter(Boolean).join(" · ") ||
                              formatDateRange(t)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <SectionHeading icon={<ScrollText className="h-3 w-3" />} kicker="Meta" title="Listas destacadas" />
          {lists.length === 0 ? (
            <EmptyBlock
              icon={<ScrollText className="h-8 w-8 text-muted-foreground/40" />}
              title="Sin listas destacadas todavía"
              text="Las listas más interesantes de la comunidad aparecerán aquí."
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {lists.map((l, i) => (
                <FeaturedListCard key={l.id} l={l} index={i} />
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/catalogo-puntos">
              <Swords className="h-4 w-4" /> Consultar puntos del Munitorum
            </Link>
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
