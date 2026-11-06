import { CAPS } from "./missions";
import type { BattleRound, GameSetup, PlayGame, Side, SideRound, SideSetup } from "./types";

export const END_OF_BATTLE = 5;

const emptySideRound = (): SideRound => ({ primary: 0, secondaries: [] });
export const emptySide = (): SideSetup => ({ detachment: "", disposition: null, secondaryMode: "tactical", fixed: [], battleReady: true });
export const emptySetup = (): GameSetup => ({ a: emptySide(), b: emptySide(), deployment: "", layout: "", twist: "", attacker: null, firstTurn: null });

/** Five battle rounds plus the end of the battle, filling what's missing. */
export function normalizeRounds(rounds: BattleRound[] | null | undefined): BattleRound[] {
  return Array.from({ length: CAPS.battleRounds + 1 }, (_, i) => ({
    a: { ...emptySideRound(), ...(rounds?.[i]?.a ?? {}) },
    b: { ...emptySideRound(), ...(rounds?.[i]?.b ?? {}) },
  }));
}

export function normalizeSetup(setup: Partial<GameSetup> | null | undefined): GameSetup {
  const base = emptySetup();
  return { ...base, ...(setup ?? {}), a: { ...base.a, ...(setup?.a ?? {}) }, b: { ...base.b, ...(setup?.b ?? {}) } };
}

export interface SideScore {
  primary: number;
  secondary: number;
  battleReady: number;
  total: number;
  /** Counted VP per battle round (after the per-round caps), end of battle last. */
  perRound: { primary: number; secondary: number }[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const clampVp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

/**
 * Victory points for one side with the matched play caps: 15 per battle round
 * for the primary and for secondaries (end-of-battle VP aren't capped per
 * round), 45 each in total, 20 per Fixed card, 10 for a Battle Ready army.
 */
export function sideScore(rounds: BattleRound[], setup: GameSetup, side: Side): SideScore {
  const rs = normalizeRounds(rounds);
  const fixedSeen = new Map<string, number>();
  const fixedCards = new Set(setup[side].secondaryMode === "fixed" ? setup[side].fixed : []);
  const perRound = rs.map((r, i) => {
    const sr = r[side];
    const end = i === END_OF_BATTLE;
    const primary = end ? clampVp(sr.primary) : Math.min(CAPS.primaryPerRound, clampVp(sr.primary));
    let secondary = 0;
    if (!end) {
      for (const s of sr.secondaries) {
        let vp = clampVp(s.vp);
        if (fixedCards.has(s.card)) {
          const used = fixedSeen.get(s.card) ?? 0;
          vp = Math.min(vp, CAPS.fixedCard - used);
          fixedSeen.set(s.card, used + vp);
        }
        secondary += vp;
      }
      secondary = Math.min(CAPS.secondaryPerRound, secondary);
    }
    return { primary, secondary };
  });
  const primary = Math.min(CAPS.primaryTotal, sum(perRound.map((r) => r.primary)));
  const secondary = Math.min(CAPS.secondaryTotal, sum(perRound.map((r) => r.secondary)));
  const battleReady = setup[side].battleReady ? CAPS.battleReady : 0;
  return { primary, secondary, battleReady, total: primary + secondary + battleReady, perRound };
}

export function gameScore(game: Pick<PlayGame, "rounds" | "setup">): { a: SideScore; b: SideScore } {
  const setup = normalizeSetup(game.setup);
  return { a: sideScore(game.rounds, setup, "a"), b: sideScore(game.rounds, setup, "b") };
}

/**
 * Victory point difference to game points, 20-0 (WTC/ETC style): up to 5 VP
 * apart is 10-10, then one point more for every 5 VP, 20-0 from 51 VP.
 */
export function toGamePoints(vpA: number, vpB: number): [number, number] {
  const diff = Math.abs(vpA - vpB);
  const step = diff <= 5 ? 0 : Math.min(10, Math.ceil((diff - 5) / 5));
  return vpA >= vpB ? [10 + step, 10 - step] : [10 - step, 10 + step];
}

export type Outcome = "win" | "draw" | "loss";

export const outcomeFor = (mine: number, theirs: number): Outcome => (mine > theirs ? "win" : mine < theirs ? "loss" : "draw");
