import { describe, expect, it } from "vitest";
import { leagueCalendar, roundRobin } from "./league";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i + 1}`);
const key = (a: string, b: string) => [a, b].sort().join("|");

describe("league calendar", () => {
  it("everyone plays everyone exactly once, one game per round each", () => {
    for (const n of [2, 3, 4, 5, 6, 9, 10]) {
      const rounds = roundRobin(ids(n));
      expect(rounds).toHaveLength(n % 2 ? n : n - 1);
      const seen = new Set<string>();
      for (const round of rounds) {
        const inRound = round.flatMap(([a, b]) => (b ? [a, b] : [a]));
        expect(new Set(inRound).size).toBe(inRound.length);
        expect(inRound).toHaveLength(n);
        for (const [a, b] of round) if (b) seen.add(key(a, b));
      }
      expect(seen.size).toBe((n * (n - 1)) / 2);
    }
  });

  it("odd numbers rest once each; home and away swaps sides", () => {
    const rounds = roundRobin(ids(5));
    const rests = rounds.flatMap((r) => r.filter(([, b]) => !b).map(([a]) => a));
    expect(new Set(rests).size).toBe(5);
    const double = roundRobin(ids(4), true);
    expect(double).toHaveLength(6);
    expect(double[3]![0]).toEqual([double[0]![0]![1], double[0]![0]![0]]);
  });

  it("spreads sides fairly and sets weekly deadlines", () => {
    const rounds = roundRobin(ids(6));
    const home = new Map<string, number>();
    for (const r of rounds) for (const [a] of r) home.set(a, (home.get(a) ?? 0) + 1);
    for (const v of home.values()) expect(v).toBeGreaterThanOrEqual(1);
    const cal = leagueCalendar(ids(3), { double: false, startsOn: "2026-11-09", roundDays: 7 });
    expect(cal.map((r) => r.deadline)).toEqual(["2026-11-15", "2026-11-22", "2026-11-29"]);
    expect(cal[0]!.pairs[cal[0]!.pairs.length - 1]!.b).toBeNull();
  });
});
