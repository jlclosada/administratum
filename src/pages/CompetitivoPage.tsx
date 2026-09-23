import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PageTransition } from "@/components/shared/PageTransition";
import { getFeaturedLists, getTournaments } from "@/db";
import { cn } from "@/lib/utils";
import type { FeaturedList, Tournament, TournamentStatus } from "@/types";
import { ExternalLink, ScrollText, Swords, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

const STATUS: Record<TournamentStatus, { label: string; dot: string }> = {
  ongoing: { label: "En curso", dot: "bg-emerald-500" },
  upcoming: { label: "Próximo", dot: "bg-sky-500" },
  finished: { label: "Finalizado", dot: "bg-muted-foreground" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function TournamentRow({ t }: { t: Tournament }) {
  const status = STATUS[t.status];
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {status.label}
          </span>
          {t.externalLink && (
            <a
              href={t.externalLink}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline sm:hidden"
            >
              Detalles <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className="mt-1 font-medium leading-tight">{t.name}</p>
        {t.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {formatDate(t.startDate)}
            {t.endDate && t.endDate !== t.startDate ? ` – ${formatDate(t.endDate)}` : ""}
          </p>
          {t.location && <p className="text-xs text-muted-foreground">{t.location}</p>}
        </div>
        {t.externalLink && (
          <a
            href={t.externalLink}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 items-center gap-1 text-xs text-primary hover:underline sm:inline-flex"
          >
            Detalles <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function FeaturedListRow({ l }: { l: FeaturedList }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {l.coverImage ? (
          <img src={l.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Swords className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{l.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {[l.factionName, l.authorName ? `por ${l.authorName}` : null].filter(Boolean).join(" · ")}
        </p>
        {l.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
        )}
      </div>
      {l.totalPoints != null && (
        <div className="shrink-0 text-right">
          <span className="font-mono text-base font-medium tabular-nums text-foreground">
            {l.totalPoints}
          </span>
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">pts</span>
        </div>
      )}
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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  const ongoing = tournaments.filter((t) => t.status === "ongoing");
  const upcoming = tournaments.filter((t) => t.status === "upcoming");
  const finished = tournaments.filter((t) => t.status === "finished");
  const orderedTournaments = [...ongoing, ...upcoming, ...finished];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Competitivo
          </h1>
          <p className="text-muted-foreground">
            Torneos de la comunidad y listas destacadas por su rendimiento o construcción.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Torneos</h2>
          </div>
          {orderedTournaments.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="Sin torneos anunciados"
              description="Vuelve pronto — aquí aparecerán los próximos torneos de la comunidad."
            />
          ) : (
            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
              {orderedTournaments.map((t) => (
                <TournamentRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Listas destacadas</h2>
          </div>
          {lists.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-8 w-8" />}
              title="Sin listas destacadas todavía"
              description="Las listas más interesantes de la comunidad aparecerán aquí."
            />
          ) : (
            <div className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
              {lists.map((l) => (
                <FeaturedListRow key={l.id} l={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
