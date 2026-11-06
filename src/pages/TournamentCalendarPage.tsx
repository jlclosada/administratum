import { DateBlock, StatusPill, TournamentCard } from "@/components/competitive/cards";
import { countdownLabel, formatDateRange } from "@/components/competitive/status";
import { PlayTournamentCard } from "@/components/play/PlayBits";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getPlayTournaments, getTournaments } from "@/db";
import type { PlayTournament } from "@/lib/play/types";
import { SEO_TORNEOS } from "@/lib/seoCopy";
import type { Tournament } from "@/types";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, History, MapPin, Plus, Swords, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** The tournament everyone should see first: live now, else the next one. */
function Spotlight({ t }: { t: Tournament }) {
  const countdown = countdownLabel(t);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
      <Link
        to={`/competitivo/torneos/${t.id}`}
        className="group relative isolate flex min-h-[320px] flex-col justify-end overflow-hidden rounded-3xl border border-border/60 p-6 sm:p-8"
      >
        <img
          src={t.coverImage || "/images/landing-hero.jpg"}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" />
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={t.status} />
          {countdown && <span className="rounded-full bg-white px-3 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-950">{countdown}</span>}
        </div>
        <h3 className="mt-3 max-w-3xl font-display text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl">{t.name}</h3>
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
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> {t.attendeeCount}
            {t.maxPlayers ? ` / ${t.maxPlayers}` : ""} asistentes
          </span>
        </div>
        <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-transform duration-300 group-hover:translate-x-1">
          Ver bases y detalles <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </motion.div>
  );
}

/**
 * /competitivo/torneos: every tournament — the ones organised and run in
 * Administratum (with sign-up) and the curated calendar of events elsewhere.
 */
export function TournamentCalendarPage() {
  const [listed, setListed] = useState<Tournament[] | null>(null);
  const [hosted, setHosted] = useState<PlayTournament[]>([]);

  useEffect(() => {
    Promise.all([getTournaments(), getPlayTournaments()]).then(([t, h]) => {
      setListed(t);
      setHosted(h);
    });
  }, []);

  const { spotlight, active, finished } = useMemo(() => {
    const all = listed ?? [];
    const byStart = (a: Tournament, b: Tournament) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999");
    const ongoing = all.filter((t) => t.status === "ongoing").sort(byStart);
    const upcoming = all.filter((t) => t.status === "upcoming").sort(byStart);
    const done = all.filter((t) => t.status === "finished").sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
    const lead = ongoing[0] ?? upcoming[0] ?? null;
    return { spotlight: lead, active: [...ongoing, ...upcoming].filter((t) => t !== lead), finished: done };
  }, [listed]);

  const today = new Date().toISOString().slice(0, 10);
  const hostedLive = hosted.filter((t) => t.status !== "cancelled" && t.status !== "finished" && (t.endsOn ?? t.startsOn) >= today);

  if (!listed) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <Seo {...SEO_TORNEOS} path="/competitivo/torneos" />
      <div className="space-y-12">
        <header className="space-y-3">
          <Link to="/competitivo" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Competitivo
          </Link>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </p>
          <h1 className="font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl">Torneos de Warhammer 40K</h1>
          <p className="max-w-2xl text-muted-foreground">Torneos en España con sus bases, fechas y plazas. Los que se organizan en Administratum tienen inscripción, listas y resultados en directo.</p>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
            <h2 className="font-display text-2xl font-black tracking-tight">Inscríbete en Administratum</h2>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/competitivo/organizar">
                <Plus className="h-3.5 w-3.5" /> Organiza el tuyo
              </Link>
            </Button>
          </div>
          {hostedLive.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
              {hostedLive.map((t, i) => (
                <PlayTournamentCard key={t.id} t={t} index={i} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Aún no hay torneos con inscripción en Administratum. ¿Tienes tienda o club?{" "}
              <Link to="/competitivo/organizar" className="text-primary underline">
                Organiza el primero
              </Link>
              .
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="border-b border-border/60 pb-3 font-display text-2xl font-black tracking-tight">Calendario</h2>
          {!spotlight && finished.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
              <Trophy className="h-8 w-8 text-muted-foreground/40" />
              <p className="font-medium">Sin torneos anunciados</p>
              <p className="text-sm text-muted-foreground">Vuelve pronto: aquí aparecerán los próximos torneos.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {spotlight && <Spotlight t={spotlight} />}
              {active.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4">
                  {active.map((t, i) => (
                    <TournamentCard key={t.id} t={t} index={i} />
                  ))}
                </div>
              )}
              {(finished.length > 0 || hosted.some((t) => t.status === "finished")) && (
                <div className="pt-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <History className="h-4 w-4" /> Historial
                  </h3>
                  <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
                    {[
                      ...hosted.filter((t) => t.status === "finished").map((t) => ({ id: t.id, to: `/torneos/${t.id}`, name: t.name, date: t.startsOn, sub: `${t.city || "Online"} · ${t.pointsLimit} pts` })),
                      ...finished.map((t) => ({
                        id: t.id,
                        to: `/competitivo/torneos/${t.id}`,
                        name: t.name,
                        date: t.startDate,
                        sub: [t.location, t.pointsLimit ? `${t.pointsLimit} pts` : null].filter(Boolean).join(" · ") || formatDateRange(t),
                      })),
                    ]
                      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                      .map((t) => (
                        <Link key={t.id} to={t.to} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent/40">
                          <DateBlock iso={t.date} className="w-12 opacity-80" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium group-hover:underline">{t.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{t.sub}</p>
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
      </div>
    </PageTransition>
  );
}
