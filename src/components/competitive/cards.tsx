import { formatResult } from "@/lib/armyListParser";
import { cn } from "@/lib/utils";
import type { FeaturedList, Tournament } from "@/types";
import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Swords, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { countdownLabel, parseDay, TOURNAMENT_STATUS } from "./status";

export function StatusPill({ status, className }: { status: Tournament["status"]; className?: string }) {
  const s = TOURNAMENT_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur",
        s.pill,
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === "ongoing" && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", s.dot)} />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", s.dot)} />
      </span>
      {s.label}
    </span>
  );
}

/** Calendar-page style day/month block. */
export function DateBlock({ iso, className }: { iso: string | null; className?: string }) {
  const d = parseDay(iso);
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border border-border/70 bg-background/80 text-center backdrop-blur",
        className,
      )}
    >
      <span className="w-full bg-foreground py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
        {d ? d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "") : "—"}
      </span>
      <span className="py-1 font-display text-2xl font-black leading-none tabular-nums">{d ? d.getDate() : "?"}</span>
    </div>
  );
}

export function TournamentCard({ t, index = 0 }: { t: Tournament; index?: number }) {
  const countdown = countdownLabel(t);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 3) * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={`/competitivo/torneos/${t.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.9)]"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-zinc-900">
          <img
            src={t.coverImage || "/images/landing-hero.jpg"}
            alt=""
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105",
              !t.coverImage && "opacity-40 grayscale",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          <DateBlock iso={t.startDate} className="absolute left-3 top-3" />
          <StatusPill status={t.status} className="absolute right-3 top-3" />
          {countdown && (
            <span className="absolute bottom-3 left-3 font-mono text-xs font-semibold uppercase tracking-wider text-white">
              {countdown}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-lg font-bold leading-tight group-hover:underline">{t.name}</h3>
          {t.description && <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
            {t.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {t.location}
              </span>
            )}
            {t.pointsLimit && (
              <span className="flex items-center gap-1">
                <Swords className="h-3.5 w-3.5" /> {t.pointsLimit} pts
              </span>
            )}
            {t.maxPlayers && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {t.maxPlayers} plazas
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Featured list in the same terminal look as the army-list card it opens. */
export function FeaturedListCard({ l, index = 0 }: { l: FeaturedList; index?: number }) {
  const result = formatResult(l.result);
  const units = l.listData?.categories.reduce((n, c) => n + c.units.length, 0) ?? null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 3) * 0.07, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link
        to={`/competitivo/listas/${l.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#050807] font-mono transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_20px_60px_-24px_rgba(16,185,129,0.35)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2">
          <span className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-500/80">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span className="truncate">{l.factionName || "Lista"}</span>
          </span>
          {result && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
              <Trophy className="h-3 w-3" /> {result}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-sans text-lg font-bold leading-tight text-zinc-100">{l.title}</h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
          </div>
          {l.description && <p className="line-clamp-2 font-sans text-sm text-zinc-500">{l.description}</p>}
          <div className="mt-auto space-y-1 pt-2 text-xs">
            {l.authorName && <p className="text-zinc-400">&gt; por {l.authorName}</p>}
            {l.tournamentName && <p className="truncate text-zinc-500">&gt; {l.tournamentName}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-emerald-500/15 px-4 py-2.5 text-xs">
          <span className="text-zinc-500">{units !== null ? `${units} unidades` : "Sin desglose"}</span>
          {l.totalPoints != null && <span className="text-emerald-400">{l.totalPoints} pts</span>}
        </div>
      </Link>
    </motion.div>
  );
}
