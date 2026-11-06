import { useFactions } from "@/components/matrix/factions";
import { FactionAvatar } from "@/components/matrix/MatrixParts";
import { PageTransition } from "@/components/shared/PageTransition";
import { Seo } from "@/components/shared/Seo";
import { Button } from "@/components/ui/button";
import { getMyFriendlyGames } from "@/db";
import { GAME_STATUS_LABEL } from "@/lib/play/labels";
import { outcomeFor } from "@/lib/play/score";
import type { FriendlyGame } from "@/lib/play/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores";
import { ArrowLeft, Dices, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/** The user's side of a game: their name, faction and VP first. */
function mine(g: FriendlyGame, uid: string) {
  const a = g.playerA === uid || (g.playerB !== uid && g.createdBy === uid);
  return a
    ? { me: g.nameA, myFaction: g.factionA, my: g.vpA, rival: g.nameB, rivalFaction: g.factionB, their: g.vpB }
    : { me: g.nameB, myFaction: g.factionB, my: g.vpB, rival: g.nameA, rivalFaction: g.factionA, their: g.vpA };
}

const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });

/** /competitivo/partidas: every one-off game you've played, with your record. */
export function FriendlyHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const factions = useFactions();
  const [games, setGames] = useState<FriendlyGame[] | null>(null);

  useEffect(() => {
    getMyFriendlyGames().then(setGames);
  }, [user?.id]);

  const stats = useMemo(() => {
    if (!games || !user) return null;
    const done = games.filter((g) => g.status === "confirmed").map((g) => mine(g, user.id));
    const count = (o: string) => done.filter((g) => outcomeFor(g.my, g.their) === o).length;
    const byFaction = new Map<string, number>();
    for (const g of done) if (g.myFaction) byFaction.set(g.myFaction, (byFaction.get(g.myFaction) ?? 0) + 1);
    const top = [...byFaction.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
    return { played: done.length, wins: count("win"), draws: count("draw"), losses: count("loss"), top };
  }, [games, user]);

  return (
    <PageTransition>
      <Seo title="Mis partidas" path="/competitivo/partidas" noindex />
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/competitivo" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Competitivo
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Partidas sueltas</p>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Mis partidas</h1>
          </div>
          <Button asChild variant="gradient" className="gap-2">
            <Link to="/competitivo/partida/nueva">
              <Plus className="h-4 w-4" /> Nueva partida
            </Link>
          </Button>
        </div>

        {stats && stats.played > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [stats.played, "partidas confirmadas"],
              [`${stats.wins}-${stats.draws}-${stats.losses}`, "victorias · empates · derrotas"],
              [`${Math.round((stats.wins / stats.played) * 100)}%`, "de victorias"],
              [stats.top ?? "—", "tu ejército más jugado"],
            ].map(([n, label]) => (
              <div key={label as string} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                <p className="truncate font-display text-2xl font-black tabular-nums">{n}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}

        {games === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
            <Dices className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 font-medium">Aún no has llevado ninguna partida</p>
            <p className="mt-1 text-sm text-muted-foreground">Crea una y puntúala ronda a ronda con las misiones de la 11ª edición.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const m = mine(g, user!.id);
              const o = g.status === "confirmed" ? outcomeFor(m.my, m.their) : null;
              return (
                <li key={g.id}>
                  <Link to={`/competitivo/partida/${g.id}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40">
                    <FactionAvatar factions={factions} faction={m.myFaction} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {m.me} vs {m.rival}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fmt.format(new Date(`${g.playedOn}T12:00:00`))} · {m.myFaction || "?"} vs {m.rivalFaction || "?"} · {g.pointsLimit} pts
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-black tabular-nums">
                        {m.my}–{m.their}
                      </p>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          o === "win" ? "bg-emerald-500/15 text-emerald-300" : o === "loss" ? "bg-red-500/15 text-red-300" : o === "draw" ? "bg-amber-400/15 text-amber-200" : "bg-background/60 text-muted-foreground",
                        )}
                      >
                        {o === "win" ? "Victoria" : o === "loss" ? "Derrota" : o === "draw" ? "Empate" : GAME_STATUS_LABEL[g.status]}
                      </span>
                    </div>
                    <FactionAvatar factions={factions} faction={m.rivalFaction} className="hidden h-10 w-10 sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
