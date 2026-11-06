import { DateBlock } from "@/components/competitive/cards";
import { useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { ArmyListCard } from "@/components/shared/ArmyListNode";
import { parseArmyListExport } from "@/lib/armyListParser";
import { capacityLabel, dateRange, formatSummary, PAYMENT_LABEL, STATUS_LABEL, whereLabel } from "@/lib/play/labels";
import { matchResult } from "@/lib/play/standings";
import type { PaymentStatus, PlayEntryPlayer, PlayMatch, PlayStatus, PlayTournament } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Store, Swords, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { PlayView } from "./usePlayData";

const STATUS_STYLE: Record<PlayStatus, string> = {
  draft: "border-border/60 bg-background/70 text-muted-foreground",
  open: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  closed: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  in_progress: "border-primary/50 bg-primary/15 text-primary",
  finished: "border-border/60 bg-background/70 text-muted-foreground",
  cancelled: "border-red-500/40 bg-red-500/15 text-red-300",
};

export function PlayStatusPill({ status, className }: { status: PlayStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur",
        STATUS_STYLE[status],
        className,
      )}
    >
      {status === "in_progress" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

const PAYMENT_STYLE: Record<PaymentStatus, string> = {
  pending: "bg-amber-400/15 text-amber-200",
  submitted: "bg-sky-500/15 text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  waived: "bg-background/60 text-muted-foreground",
  rejected: "bg-red-500/15 text-red-300",
};

export function PaymentPill({ status, className }: { status: PaymentStatus; className?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", PAYMENT_STYLE[status], className)}>{PAYMENT_LABEL[status]}</span>;
}

/** A tournament organised in Administratum, for lists and the calendar. */
export function PlayTournamentCard({ t, index = 0, registered }: { t: PlayTournament; index?: number; registered?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 3) * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={`/torneos/${t.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
          <img
            src={t.coverImage || "/images/landing-hero.jpg"}
            alt=""
            className={cn("h-full w-full object-cover transition-transform duration-700 group-hover:scale-105", !t.coverImage && "opacity-40 grayscale")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <DateBlock iso={t.startsOn} className="absolute left-3 top-3" />
          <PlayStatusPill status={t.status} className="absolute right-3 top-3" />
          <span className="absolute bottom-3 left-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            {formatSummary(t)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-lg font-bold leading-tight group-hover:underline">{t.name}</h3>
          {t.organizerName && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="h-3.5 w-3.5" /> {t.organizerName}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {whereLabel(t)}
            </span>
            <span className="flex items-center gap-1">
              <Swords className="h-3.5 w-3.5" /> {t.pointsLimit} pts
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {registered !== undefined ? `${registered}/${t.maxEntries}` : capacityLabel(t)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Compact one-line tournament row (hub, profile). */
export function PlayTournamentRow({ t, extra }: { t: PlayTournament; extra?: React.ReactNode }) {
  return (
    <Link
      to={`/torneos/${t.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40"
    >
      <DateBlock iso={t.startsOn} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{t.name}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" /> {dateRange(t)} · {whereLabel(t)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <PlayStatusPill status={t.status} />
          {extra}
        </div>
      </div>
    </Link>
  );
}

/** Player chips with their faction art. */
export function RosterChips({ players, className }: { players: PlayEntryPlayer[]; className?: string }) {
  const factions = useFactions();
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {players.map((p) => (
        <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-border/60 py-0.5 pl-0.5 pr-2.5 text-xs" title={p.faction || "Sin ejército"}>
          <FactionAvatar factions={factions} faction={p.faction} className="h-6 w-6" />
          <span className="max-w-[8rem] truncate">{p.displayName}</span>
        </span>
      ))}
    </div>
  );
}

/** Ranking table: points, W-D-L, game points (teams), VP difference, strength of schedule. */
export function StandingsTable({ view }: { view: PlayView }) {
  const teams = view.tournament.teamSize > 1;
  if (!view.table.some((r) => r.played)) {
    return <p className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">La clasificación aparece cuando se confirma el primer resultado.</p>;
  }
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[34rem] border-separate border-spacing-y-1.5 text-sm">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="w-10 px-2 font-normal">#</th>
            <th className="px-2 font-normal">{teams ? "Equipo" : "Jugador"}</th>
            <th className="px-2 text-center font-normal">Pts</th>
            <th className="px-2 text-center font-normal">V-E-D</th>
            {teams && <th className="px-2 text-center font-normal">{view.tournament.scoring === "wtc" ? "Puntos partida" : "Partidas"}</th>}
            <th className="px-2 text-center font-normal">Dif. PV</th>
            <th className="px-2 text-center font-normal" title="Fuerza de los rivales: puntos de los equipos a los que te has enfrentado">
              FdR
            </th>
          </tr>
        </thead>
        <tbody>
          {view.table.map((r) => {
            const e = view.entryById.get(r.entryId);
            const mine = view.myEntry?.id === r.entryId;
            return (
              <tr key={r.entryId} className={cn("bg-card/40", mine && "bg-primary/10")}>
                <td className="rounded-l-xl px-2 py-2.5 font-display text-lg font-black tabular-nums">{r.rank}</td>
                <td className="px-2 py-2.5">
                  <p className="font-medium">{e?.name}</p>
                  {teams && <RosterChips players={view.playersOf(r.entryId)} className="mt-1 hidden sm:flex" />}
                </td>
                <td className="px-2 py-2.5 text-center font-display text-lg font-black tabular-nums">{r.points}</td>
                <td className="px-2 py-2.5 text-center tabular-nums">
                  {r.wins}-{r.draws}-{r.losses}
                </td>
                {teams && <td className="px-2 py-2.5 text-center tabular-nums">{r.gamePoints}</td>}
                <td className="px-2 py-2.5 text-center tabular-nums">{r.vpFor - r.vpAgainst > 0 ? `+${r.vpFor - r.vpAgainst}` : r.vpFor - r.vpAgainst}</td>
                <td className="rounded-r-xl px-2 py-2.5 text-center tabular-nums text-muted-foreground">{r.sos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** An army list as the terminal-style card, or plain text if it doesn't parse. */
export function ListView({ text, author }: { text: string; author: string }) {
  const parsed = parseArmyListExport(text);
  if (parsed) return <ArmyListCard data={parsed} authorName={author} result={null} />;
  return <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/60 p-3 font-mono text-xs">{text}</pre>;
}

/** Big header for a tournament page. */
export function PlayHeader({ t, children }: { t: PlayTournament; children?: React.ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-card/30 p-5 sm:p-8">
      <img
        src={t.coverImage || "/images/landing-hero.jpg"}
        alt=""
        className={cn("absolute inset-0 -z-10 h-full w-full object-cover", t.coverImage ? "opacity-35" : "opacity-15 grayscale")}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/30" />
      <div className="flex flex-wrap items-center gap-2">
        <PlayStatusPill status={t.status} />
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">{formatSummary(t)}</span>
        <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-[11px] font-semibold">{t.pointsLimit} puntos</span>
      </div>
      <h1 className="mt-3 max-w-3xl font-display text-3xl font-black leading-[0.95] tracking-tight sm:text-5xl">{t.name}</h1>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" /> {dateRange(t)}
          {t.startTime ? `, ${t.startTime.slice(0, 5)}` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {whereLabel(t)}
        </span>
        {t.organizerName && (
          <span className="flex items-center gap-1.5">
            <Store className="h-4 w-4" /> {t.organizerName}
          </span>
        )}
      </div>
      {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

/** One pairing of a round: table, both sides and the live score. */
export function MatchCard({ view, match }: { view: PlayView; match: PlayMatch }) {
  const t = view.tournament;
  const a = view.entryById.get(match.entryA);
  const b = match.entryB ? view.entryById.get(match.entryB) : null;
  const r = matchResult(t, match, view.games);
  const mine = view.myEntry && (match.entryA === view.myEntry.id || match.entryB === view.myEntry.id);
  const live = view.games.filter((g) => g.matchId === match.id);
  const liveA = t.teamSize === 1 ? (live[0]?.vpA ?? 0) : r.scoreA;
  const liveB = t.teamSize === 1 ? (live[0]?.vpB ?? 0) : r.scoreB;
  const started = live.some((g) => g.status !== "setup");
  return (
    <Link
      to={b ? `/torneos/${t.id}/partidas/${match.id}` : "#"}
      onClick={(e) => !b && e.preventDefault()}
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border bg-card/40 p-3 transition-colors",
        mine ? "border-primary/50 bg-primary/5" : "border-border/60",
        b && "hover:border-primary/40",
      )}
    >
      <span className="font-mono text-xs text-muted-foreground">M{match.tableNo}</span>
      <span className={cn("truncate text-right text-sm font-medium", r.outcomeA === "win" && "text-emerald-300")}>{a?.name}</span>
      <span className="rounded-lg bg-background/60 px-2 py-1 text-center font-display text-sm font-black tabular-nums">
        {b ? (started || r.final ? `${liveA} – ${liveB}` : "vs") : "BYE"}
      </span>
      <span className={cn("truncate text-sm font-medium", r.outcomeA === "loss" && "text-emerald-300")}>{b ? b.name : "Descansa"}</span>
    </Link>
  );
}
