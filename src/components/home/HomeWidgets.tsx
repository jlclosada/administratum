import { StarRating } from "@/components/shared/StarRating";
import { countdownLabel, parseDay } from "@/components/competitive/status";
import { guideRating } from "@/db";
import { formatDelta, pointsDeltaOf, updateTarget } from "@/lib/catalogUpdates";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Article, CatalogUpdate, MiniatureSpotlight, PaintingGuide, Tournament } from "@/types";
import { ArrowDown, ArrowUp, Download, Newspaper, Star, Target, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Side-rail card: small header with an icon and an optional "Ver todo". */
export function Widget({
  title,
  icon: Icon,
  to,
  action,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  to?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {action}
          {to && (
            <Link to={to} className="text-xs text-muted-foreground transition-colors hover:text-primary">
              Ver todo
            </Link>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * A points increase makes the unit more expensive (a nerf), a decrease
 * cheaper: rose up, emerald down, with an arrow so colour isn't the only cue.
 */
export function DeltaBadge({ update }: { update: CatalogUpdate }) {
  const delta = pointsDeltaOf(update);
  if (delta === null) return null;
  const up = delta > 0;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums",
        up ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      )}
      title={update.pointsBefore != null && update.pointsAfter != null ? `${update.pointsBefore} → ${update.pointsAfter} pts` : undefined}
    >
      <Arrow className="h-3 w-3" />
      {formatDelta(delta)}
    </span>
  );
}

export function NewsWidget({ articles, action }: { articles: Article[]; action?: ReactNode }) {
  const [lead, ...rest] = articles.slice(0, 4);
  return (
    <Widget title="Noticias" icon={Newspaper} action={action}>
      {!lead ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Aún no hay noticias.</p>
      ) : (
        <div>
          <Link to={`/articulos/${lead.id}`} className="group block">
            <div className="relative aspect-[16/9] overflow-hidden bg-muted">
              {lead.coverImage && (
                <img
                  src={lead.coverImage}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{lead.title}</p>
                <p className="mt-0.5 text-[11px] text-white/60">{timeAgo(lead.createdAt)}</p>
              </div>
            </div>
          </Link>
          <ul className="divide-y divide-border/50">
            {rest.map((a) => (
              <li key={a.id}>
                <Link to={`/articulos/${a.id}`} className="group flex gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                  <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {a.coverImage && <img src={a.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-primary">{a.title}</span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Widget>
  );
}

export function PointsWidget({ updates }: { updates: CatalogUpdate[] }) {
  return (
    <Widget title="Cambios de puntos" icon={Target} to="/cambios-puntos">
      {updates.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Sin cambios recientes.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {updates.slice(0, 7).map((u) => {
            const Icon = u.type === "points" ? Target : Download;
            const inner = (
              <>
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{u.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{u.description}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <DeltaBadge update={u} />
                  <span className="text-[10px] tabular-nums text-muted-foreground/70">{timeAgo(u.occurredAt)}</span>
                </span>
              </>
            );
            return (
              <li key={u.id}>
                {u.link ? (
                  <Link to={u.type === "points" ? updateTarget(u).href : u.link} className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent/40">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2.5 px-4 py-2.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export function TournamentsWidget({ tournaments }: { tournaments: Tournament[] }) {
  return (
    <Widget title="Próximos torneos" icon={Star} to="/competitivo">
      {tournaments.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">No hay torneos próximos publicados.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {tournaments.slice(0, 3).map((t) => {
            const day = parseDay(t.startDate);
            const countdown = countdownLabel(t);
            return (
              <li key={t.id}>
                <Link to={`/competitivo/torneos/${t.id}`} className="group flex gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                  <span className="flex w-11 shrink-0 flex-col items-center rounded-lg border border-border/60 py-1">
                    <span className="font-display text-lg font-bold leading-none">{day?.getDate() ?? "?"}</span>
                    <span className="mt-0.5 text-[9px] font-semibold tracking-wider text-primary">
                      {day ? MONTHS[day.getMonth()] : "—"}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[13px] font-medium leading-snug group-hover:text-primary">{t.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[t.location, countdown, t.maxPlayers ? `${t.attendeeCount}/${t.maxPlayers} plazas` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Widget>
  );
}

export function GuidesWidget({ guides }: { guides: PaintingGuide[] }) {
  return (
    <Widget title="Guías destacadas" icon={Star} to="/guias">
      {guides.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">Aún no hay guías.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {guides.slice(0, 3).map((g) => (
            <li key={g.id}>
              <Link to={`/guias/${g.id}`} className="group flex gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {g.coverImage && <img src={g.coverImage} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-1 text-[13px] font-medium group-hover:text-primary">{g.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">por {g.authorName}</span>
                  <StarRating value={guideRating(g)} size="sm" readOnly />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export function SpotlightCard({ spotlight, className }: { spotlight: MiniatureSpotlight; className?: string }) {
  return (
    <article className={cn("group overflow-hidden rounded-2xl border border-border/60 bg-card/40", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {spotlight.image ? (
          <img
            src={spotlight.image}
            alt={spotlight.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Star className="h-10 w-10 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary backdrop-blur">
          <Star className="h-3 w-3 fill-current" />
          Miniatura del mes
        </span>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h2 className="font-display text-lg font-bold leading-tight text-white">{spotlight.title}</h2>
          <p className="mt-0.5 text-xs text-white/70">
            {[spotlight.factionName, spotlight.painterName ? `pintada por ${spotlight.painterName}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </article>
  );
}
