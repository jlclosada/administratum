import {
  getPlayEntries,
  getPlayEntryPlayers,
  getPlayGames,
  getPlayLists,
  getPlayMatches,
  getPlayPayments,
  getPlayRounds,
  getPlayTournament,
  subscribeToPlay,
} from "@/db";
import { standings, type StandingRow } from "@/lib/play/standings";
import type { PlayEntry, PlayEntryPlayer, PlayGame, PlayList, PlayMatch, PlayPayment, PlayRound, PlayTournament } from "@/lib/play/types";
import { useAuthStore } from "@/stores";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface PlayData {
  tournament: PlayTournament;
  entries: PlayEntry[];
  players: PlayEntryPlayer[];
  payments: PlayPayment[];
  lists: PlayList[];
  rounds: PlayRound[];
  matches: PlayMatch[];
  games: PlayGame[];
}

export interface PlayView extends PlayData {
  isOrganizer: boolean;
  /** The signed-in user's entry (as captain or player), if any. */
  myEntry: PlayEntry | null;
  table: StandingRow[];
  entryById: Map<string, PlayEntry>;
  playerById: Map<string, PlayEntryPlayer>;
  playersOf: (entryId: string) => PlayEntryPlayer[];
}

/**
 * Everything about one tournament, refreshed live when games or pairings
 * change (Supabase Realtime) and on demand after an action.
 */
export function usePlayData(tournamentId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<PlayData | null | undefined>(undefined);

  const load = useCallback(async () => {
    if (!tournamentId) return setData(null);
    const tournament = await getPlayTournament(tournamentId);
    if (!tournament) return setData(null);
    const [entries, players, payments, lists, rounds, matches, games] = await Promise.all([
      getPlayEntries(tournamentId),
      getPlayEntryPlayers(tournamentId),
      user ? getPlayPayments(tournamentId) : Promise.resolve([]),
      getPlayLists(tournamentId),
      getPlayRounds(tournamentId),
      getPlayMatches(tournamentId),
      getPlayGames(tournamentId),
    ]);
    setData({ tournament, entries, players, payments, lists, rounds, matches, games });
  }, [tournamentId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tournamentId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Several rows change at once (a whole round): refresh once.
    const unsubscribe = subscribeToPlay(tournamentId, () => {
      clearTimeout(timer);
      timer = setTimeout(load, 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [tournamentId, load]);

  const view = useMemo<PlayView | null | undefined>(() => {
    if (!data) return data;
    const entryById = new Map(data.entries.map((e) => [e.id, e]));
    const playerById = new Map(data.players.map((p) => [p.id, p]));
    const uid = user?.id;
    const myEntry =
      (uid &&
        data.entries.find(
          (e) => e.status !== "withdrawn" && (e.captainId === uid || data.players.some((p) => p.entryId === e.id && p.userId === uid)),
        )) ||
      null;
    return {
      ...data,
      isOrganizer: !!uid && data.tournament.organizerId === uid,
      myEntry,
      table: standings(data.tournament, data.entries, data.matches, data.games),
      entryById,
      playerById,
      playersOf: (entryId: string) => data.players.filter((p) => p.entryId === entryId).sort((a, b) => a.position - b.position),
    };
  }, [data, user?.id]);

  return { view, reload: load };
}
