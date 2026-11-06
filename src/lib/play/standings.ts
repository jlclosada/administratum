import { outcomeFor, toGamePoints, type Outcome } from "./score";
import type { PlayEntry, PlayGame, PlayMatch, PlayTournament } from "./types";

/** Tournament points for a match: 2 win, 1 draw, 0 loss (as at the WTC). */
export const MATCH_POINTS: Record<Outcome, number> = { win: 2, draw: 1, loss: 0 };

export interface MatchResult {
  /** All games confirmed (or a bye). */
  final: boolean;
  /** Game points (20-0 scale) or games won, per side. */
  scoreA: number;
  scoreB: number;
  vpA: number;
  vpB: number;
  outcomeA: Outcome | null;
  confirmedGames: number;
  totalGames: number;
}

/**
 * A match from its games. Singles: the one game decides it. Teams: the sum
 * of 20-0 game points (WTC) or the number of games won; a bye counts as the
 * narrowest win.
 */
export function matchResult(t: Pick<PlayTournament, "teamSize" | "scoring">, match: PlayMatch, games: PlayGame[]): MatchResult {
  if (!match.entryB) {
    const winBy = t.teamSize > 1 && t.scoring === "wtc" ? t.teamSize * 10 + 1 : t.teamSize > 1 ? Math.floor(t.teamSize / 2) + 1 : 0;
    return { final: true, scoreA: winBy, scoreB: 0, vpA: 0, vpB: 0, outcomeA: "win", confirmedGames: 0, totalGames: 0 };
  }
  const mine = games.filter((g) => g.matchId === match.id);
  const done = mine.filter((g) => g.status === "confirmed");
  let scoreA = 0;
  let scoreB = 0;
  let vpA = 0;
  let vpB = 0;
  for (const g of done) {
    vpA += g.vpA;
    vpB += g.vpB;
    if (t.teamSize > 1 && t.scoring === "wtc") {
      const [a, b] = toGamePoints(g.vpA, g.vpB);
      scoreA += a;
      scoreB += b;
    } else {
      const o = outcomeFor(g.vpA, g.vpB);
      if (o === "win") scoreA += 1;
      if (o === "loss") scoreB += 1;
    }
  }
  const expected = t.teamSize > 1 ? t.teamSize : 1;
  const final = done.length >= expected && done.length === mine.length;
  const outcomeA = final ? (t.teamSize === 1 ? outcomeFor(vpA, vpB) : outcomeFor(scoreA, scoreB)) : null;
  return { final, scoreA, scoreB, vpA, vpB, outcomeA, confirmedGames: done.length, totalGames: Math.max(mine.length, expected) };
}

export interface StandingRow {
  entryId: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  /** Teams: game points (20-0) or games won; singles: same as VP difference. */
  gamePoints: number;
  vpFor: number;
  vpAgainst: number;
  /** Strength of schedule: tournament points of the opponents faced. */
  sos: number;
  opponents: string[];
  byes: number;
}

/** Ranking: points, then game points (teams), VP difference, VP scored, strength of schedule. */
export function standings(
  t: Pick<PlayTournament, "teamSize" | "scoring">,
  entries: PlayEntry[],
  matches: PlayMatch[],
  games: PlayGame[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const e of entries) {
    if (e.status !== "registered") continue;
    rows.set(e.id, { entryId: e.id, rank: 0, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gamePoints: 0, vpFor: 0, vpAgainst: 0, sos: 0, opponents: [], byes: 0 });
  }
  for (const m of matches) {
    const r = matchResult(t, m, games);
    if (!r.final || !r.outcomeA) continue;
    const a = rows.get(m.entryA);
    const b = m.entryB ? rows.get(m.entryB) : undefined;
    const apply = (row: StandingRow | undefined, o: Outcome, gp: number, vf: number, va: number, opp: string | null) => {
      if (!row) return;
      row.played++;
      if (o === "win") row.wins++;
      else if (o === "draw") row.draws++;
      else row.losses++;
      row.points += MATCH_POINTS[o];
      row.gamePoints += gp;
      row.vpFor += vf;
      row.vpAgainst += va;
      if (opp) row.opponents.push(opp);
      else row.byes++;
    };
    const oB: Outcome = r.outcomeA === "win" ? "loss" : r.outcomeA === "loss" ? "win" : "draw";
    apply(a, r.outcomeA, r.scoreA, r.vpA, r.vpB, m.entryB);
    if (m.entryB) apply(b, oB, r.scoreB, r.vpB, r.vpA, m.entryA);
  }
  for (const row of rows.values()) row.sos = row.opponents.reduce((s, id) => s + (rows.get(id)?.points ?? 0), 0);
  const teams = t.teamSize > 1;
  const sorted = [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      (teams ? y.gamePoints - x.gamePoints : 0) ||
      y.vpFor - y.vpAgainst - (x.vpFor - x.vpAgainst) ||
      y.vpFor - x.vpFor ||
      y.sos - x.sos,
  );
  sorted.forEach((row, i) => (row.rank = i + 1));
  return sorted;
}
