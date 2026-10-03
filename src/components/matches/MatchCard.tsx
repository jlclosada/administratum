import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDistance } from "@/lib/geo";
import { FORMAT_LABEL, LEVEL_LABEL, matchDay, matchPlace, matchTime, spotsLeft } from "@/lib/matches";
import { cn } from "@/lib/utils";
import type { Match, Profile } from "@/types";
import { Clock, MapPin, Swords } from "lucide-react";
import { Link } from "react-router-dom";

const LEVEL_TONE: Record<Match["level"], string> = {
  iniciacion: "bg-emerald-500/15 text-emerald-400",
  casual: "bg-sky-500/15 text-sky-400",
  intermedio: "bg-amber-500/15 text-amber-400",
  competitivo: "bg-rose-500/15 text-rose-400",
};

/** One open game in the search results. */
export function MatchCard({ match: m, host, joined }: { match: Match; host?: Profile; joined?: boolean }) {
  const d = new Date(`${m.startsOn}T00:00:00`);
  const left = spotsLeft(m);
  const distance = formatDistance(m.distanceKm);
  return (
    <Link
      to={`/partidas/${m.id}`}
      className={cn(
        "group flex gap-4 rounded-2xl border bg-card/40 p-4 transition-colors hover:border-primary/40",
        joined ? "border-primary/40" : "border-border/60",
        m.status === "cancelled" && "opacity-60",
      )}
    >
      <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-background/40 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}</span>
        <span className="font-display text-2xl font-black leading-none">{d.getDate()}</span>
        <span className="text-[10px] uppercase text-muted-foreground">{d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold group-hover:text-primary">
            {m.title || `${FORMAT_LABEL[m.format]}${m.pointsLimit ? ` · ${m.pointsLimit} pts` : ""}`}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", LEVEL_TONE[m.level])}>{LEVEL_LABEL[m.level]}</span>
          {m.status === "cancelled" && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">Cancelada</span>}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {matchDay(m.startsOn)} · {matchTime(m)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {matchPlace(m)}
            {distance && <span className="text-primary"> · {distance}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2 pt-1">
          <UserAvatar src={host?.avatarUrl} name={host?.displayName} size="xs" />
          <span className="min-w-0 truncate text-xs">
            {host?.displayName ?? "Jugador"}
            {m.hostFaction && (
              <span className="text-muted-foreground">
                {" "}
                · <Swords className="inline h-3 w-3" /> {m.hostFaction}
              </span>
            )}
          </span>
          <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", left > 0 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
            {joined ? "Apuntado" : left > 0 ? `${left} ${left === 1 ? "plaza libre" : "plazas libres"}` : "Completa"}
          </span>
        </span>
      </span>
    </Link>
  );
}
