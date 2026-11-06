import { GameTracker } from "@/components/play/GameTracker";
import { usePlayData } from "@/components/play/usePlayData";
import { Button } from "@/components/ui/button";
import { confirmPlayGame, getPlayGame, updatePlayGame } from "@/db";
import { useIsAdmin } from "@/lib/admin";
import { roundNoun } from "@/lib/play/labels";
import { useAuthStore } from "@/stores";
import { Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

/** A tournament game: the shared tracker, with the tournament's players and rules. */
export function GamePage() {
  const { tournamentId, gameId } = useParams();
  const { view, reload } = usePlayData(tournamentId);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useIsAdmin();
  const game = view?.games.find((g) => g.id === gameId);
  if (view === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!view || !game) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Partida no encontrada</h1>
        <Button asChild variant="gradient">
          <Link to={`/torneos/${tournamentId}`}>Volver al torneo</Link>
        </Button>
      </div>
    );
  }
  const t = view.tournament;
  const pa = game.playerA ? view.playerById.get(game.playerA) : undefined;
  const pb = game.playerB ? view.playerById.get(game.playerB) : undefined;
  const ea = pa ? view.entryById.get(pa.entryId) : undefined;
  const eb = pb ? view.entryById.get(pb.entryId) : undefined;
  const match = view.matches.find((m) => m.id === game.matchId);
  const round = view.rounds.find((r) => r.id === match?.roundId);
  const organizer = view.isOrganizer || isAdmin;
  const locked = game.status === "confirmed" && !organizer;
  const listOf = (id?: string) => view.lists.find((l) => l.entryPlayerId === id);
  const la = listOf(pa?.id);
  const lb = listOf(pb?.id);
  return (
    <GameTracker
      game={{ ...game, label: `M${game.tableNo}${round ? ` · ${roundNoun(t)} ${round.number}` : ""}` }}
      sides={{
        a: { name: pa?.displayName ?? "—", faction: la?.faction || pa?.faction || "", listText: la?.listText, listDetachment: la?.detachment },
        b: { name: pb?.displayName ?? "—", faction: lb?.faction || pb?.faction || "", listText: lb?.listText, listDetachment: lb?.detachment },
      }}
      can={{
        a: !locked && (organizer || (!!user && (pa?.userId === user.id || ea?.captainId === user.id))),
        b: !locked && (organizer || (!!user && (pb?.userId === user.id || eb?.captainId === user.id))),
      }}
      confirmsForBoth={organizer}
      gamePoints={t.teamSize > 1 && t.scoring === "wtc"}
      back={{
        to: match && t.teamSize > 1 ? `/torneos/${t.id}/partidas/${match.id}` : `/torneos/${t.id}`,
        label: t.teamSize > 1 && ea && eb ? `${ea.name} vs ${eb.name}` : t.name,
      }}
      seo={{ title: `${pa?.displayName ?? "?"} vs ${pb?.displayName ?? "?"} · ${t.name}`, path: `/torneos/${t.id}/juegos/${game.id}` }}
      defaults={round ? { deployment: round.deployment, layout: round.layout } : undefined}
      confirmedNote="Cuenta para la clasificación."
      load={() => getPlayGame(game.id)}
      save={(patch) => updatePlayGame(game.id, patch)}
      submit={() => updatePlayGame(game.id, { status: "submitted" })}
      confirm={() => confirmPlayGame(game.id)}
      onChanged={reload}
    />
  );
}
