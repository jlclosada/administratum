/**
 * The WTC pairing inside a team match, as a pure function of the picks.
 *
 * Each step both teams pick in secret, then reveal at once:
 *   1. a defender;
 *   2. two attackers for the other team's defender;
 *   3. each defender chooses which of the two attackers it plays — the
 *      refused attacker goes back to the pool.
 * That fixes two games per step. When four or fewer players are left per
 * team the step closes the pairing: the two refused attackers play each
 * other and, with four, the last player of each team too.
 */

import type { Side } from "./types";

export type PickKind = "defender" | "attackers" | "choice";

export interface PairingPick {
  entryId: string;
  step: number;
  kind: PickKind;
  players: string[];
}

export interface WtcGame {
  a: string;
  b: string;
}

export interface WtcState {
  step: number;
  phase: PickKind | "done";
  /** The step that will close the pairing (four or fewer left). */
  final: boolean;
  /** Who still has to pick in the current phase. */
  waiting: Record<Side, boolean>;
  /** Players still to be paired at the start of this step. */
  pool: Record<Side, string[]>;
  /** Revealed this step. */
  defenders: Partial<Record<Side, string>>;
  /** attackers.a: what team A offered to B's defender. */
  attackers: Partial<Record<Side, string[]>>;
  games: WtcGame[];
}

const without = (xs: string[], ...out: (string | undefined)[]) => xs.filter((x) => !out.includes(x));

export function wtcState(rosterA: string[], rosterB: string[], entryA: string, entryB: string, picks: PairingPick[]): WtcState {
  const find = (side: Side, step: number, kind: PickKind) => picks.find((p) => p.entryId === (side === "a" ? entryA : entryB) && p.step === step && p.kind === kind);
  let pool = { a: [...rosterA], b: [...rosterB] };
  const games: WtcGame[] = [];
  const base = (step: number, final: boolean) => ({ step, final, pool: { a: [...pool.a], b: [...pool.b] }, games: [...games] });

  for (let step = 0; step < 9; step++) {
    const n = Math.min(pool.a.length, pool.b.length);
    if (n <= 2) {
      // Too few for a defender and two attackers (pairs, or a short roster).
      for (let i = 0; i < n; i++) games.push({ a: pool.a[i]!, b: pool.b[i]! });
      return { ...base(step, true), games, phase: "done", waiting: { a: false, b: false }, defenders: {}, attackers: {} };
    }
    const final = n <= 4;
    const dA = find("a", step, "defender");
    const dB = find("b", step, "defender");
    if (!dA || !dB) return { ...base(step, final), phase: "defender", waiting: { a: !dA, b: !dB }, defenders: {}, attackers: {} };
    const defenders = { a: dA.players[0]!, b: dB.players[0]! };
    const aA = find("a", step, "attackers");
    const aB = find("b", step, "attackers");
    if (!aA || !aB) return { ...base(step, final), phase: "attackers", waiting: { a: !aA, b: !aB }, defenders, attackers: {} };
    const attackers = { a: aA.players, b: aB.players };
    const cA = find("a", step, "choice"); // A's defender picks one of B's attackers
    const cB = find("b", step, "choice");
    if (!cA || !cB) return { ...base(step, final), phase: "choice", waiting: { a: !cA, b: !cB }, defenders, attackers };

    const chosenB = cA.players[0]!; // B's attacker playing A's defender
    const chosenA = cB.players[0]!; // A's attacker playing B's defender
    games.push({ a: defenders.a, b: chosenB }, { a: chosenA, b: defenders.b });
    const refusedA = attackers.a.find((x) => x !== chosenA);
    const refusedB = attackers.b.find((x) => x !== chosenB);
    if (final) {
      if (refusedA && refusedB) games.push({ a: refusedA, b: refusedB });
      const leftA = without(pool.a, defenders.a, ...attackers.a);
      const leftB = without(pool.b, defenders.b, ...attackers.b);
      for (let i = 0; i < Math.min(leftA.length, leftB.length); i++) games.push({ a: leftA[i]!, b: leftB[i]! });
      return { ...base(step + 1, true), games, phase: "done", waiting: { a: false, b: false }, defenders: {}, attackers: {} };
    }
    pool = { a: without(pool.a, defenders.a, chosenA), b: without(pool.b, defenders.b, chosenB) };
  }
  return { ...base(9, true), phase: "done", waiting: { a: false, b: false }, defenders: {}, attackers: {} };
}

/** scores[mine][theirs]: our matrix, 1–5 (missing = 3). */
export type ScoreLookup = (mine: string, theirs: string) => number;

export interface Suggestion {
  players: string[];
  why: string;
}

/**
 * What our matrix suggests for the current phase, from `side`'s point of view.
 * names: player id → name, for the explanation.
 */
export function suggest(state: WtcState, side: Side, score: ScoreLookup, names: (id: string) => string): Suggestion | null {
  const other: Side = side === "a" ? "b" : "a";
  const mine = state.pool[side];
  if (state.phase === "defender") {
    const theirs = state.pool[other];
    // A defender keeps the second worst of what the rival can send.
    const ranked = mine
      .map((p) => {
        const row = theirs.map((t) => score(p, t)).sort((x, y) => x - y);
        return { p, value: row[Math.min(1, row.length - 1)] ?? 3, avg: row.reduce((s, x) => s + x, 0) / (row.length || 1) };
      })
      .sort((x, y) => y.value - x.value || y.avg - x.avg);
    const best = ranked[0];
    return best ? { players: [best.p], why: `${names(best.p)}: aunque te manden sus dos peores cruces, se queda con un ${best.value}.` } : null;
  }
  if (state.phase === "attackers") {
    const theirDefender = state.defenders[other];
    if (!theirDefender) return null;
    const pool = mine.filter((p) => p !== state.defenders[side]);
    const ranked = pool.map((p) => ({ p, s: score(p, theirDefender) })).sort((x, y) => y.s - x.s);
    const two = ranked.slice(0, 2);
    if (two.length < 2) return null;
    return { players: two.map((x) => x.p), why: `Tus mejores cruces contra ${names(theirDefender)}: ${two.map((x) => `${names(x.p)} (${x.s})`).join(" y ")}.` };
  }
  if (state.phase === "choice") {
    const myDefender = state.defenders[side];
    const offered = state.attackers[other];
    if (!myDefender || !offered) return null;
    const ranked = offered.map((t) => ({ t, s: score(myDefender, t) })).sort((x, y) => y.s - x.s);
    const best = ranked[0]!;
    return { players: [best.t], why: `${names(myDefender)} prefiere a ${names(best.t)} (${best.s}) frente a ${names(ranked[1]!.t)} (${ranked[1]!.s}).` };
  }
  return null;
}
