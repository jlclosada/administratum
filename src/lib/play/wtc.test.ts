import { describe, expect, it } from "vitest";
import { suggest, wtcState, type PairingPick } from "./wtc";

const A = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"];
const B = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"];
const pick = (entryId: string, step: number, kind: PairingPick["kind"], ...players: string[]): PairingPick => ({ entryId, step, kind, players });

/** Plays a whole step: defenders, attackers, choices. */
function step(s: number, defA: string, defB: string, attA: [string, string], attB: [string, string], choiceA: string, choiceB: string): PairingPick[] {
  return [
    pick("A", s, "defender", defA),
    pick("B", s, "defender", defB),
    pick("A", s, "attackers", ...attA),
    pick("B", s, "attackers", ...attB),
    pick("A", s, "choice", choiceA),
    pick("B", s, "choice", choiceB),
  ];
}

describe("WTC pairing", () => {
  it("waits for both teams before moving on", () => {
    const s = wtcState(A, B, "A", "B", [pick("A", 0, "defender", "a1")]);
    expect(s.phase).toBe("defender");
    expect(s.waiting).toEqual({ a: false, b: true });
    const t = wtcState(A, B, "A", "B", [pick("A", 0, "defender", "a1"), pick("B", 0, "defender", "b1")]);
    expect(t.phase).toBe("attackers");
    expect(t.defenders).toEqual({ a: "a1", b: "b1" });
  });

  it("pairs 8 players in three steps; refused attackers go back to the pool", () => {
    const picks = [
      ...step(0, "a1", "b1", ["a2", "a3"], ["b2", "b3"], "b2", "a2"), // a1-b2, a2-b1; a3 and b3 back
      ...step(1, "a3", "b3", ["a4", "a5"], ["b4", "b5"], "b5", "a4"), // a3-b5, a4-b3; 6 left -> 4
    ];
    const mid = wtcState(A, B, "A", "B", picks);
    expect(mid.step).toBe(2);
    expect(mid.final).toBe(true);
    expect(mid.pool.a).toEqual(["a5", "a6", "a7", "a8"]);
    expect(mid.games).toEqual([
      { a: "a1", b: "b2" },
      { a: "a2", b: "b1" },
      { a: "a3", b: "b5" },
      { a: "a4", b: "b3" },
    ]);
    const done = wtcState(A, B, "A", "B", [...picks, ...step(2, "a5", "b4", ["a6", "a7"], ["b6", "b7"], "b7", "a6")]);
    expect(done.phase).toBe("done");
    expect(done.games).toHaveLength(8);
    // last step: defenders' games, refused attackers, and the last player of each team
    expect(done.games.slice(4)).toEqual([
      { a: "a5", b: "b7" },
      { a: "a6", b: "b4" },
      { a: "a7", b: "b6" },
      { a: "a8", b: "b8" },
    ]);
    const used = new Set(done.games.flatMap((g) => [g.a, g.b]));
    expect(used.size).toBe(16);
  });

  it("closes a team of 3 in one step and a team of 5 in two", () => {
    const three = wtcState(["a1", "a2", "a3"], ["b1", "b2", "b3"], "A", "B", step(0, "a1", "b1", ["a2", "a3"], ["b2", "b3"], "b3", "a2"));
    expect(three.phase).toBe("done");
    expect(three.games).toEqual([
      { a: "a1", b: "b3" },
      { a: "a2", b: "b1" },
      { a: "a3", b: "b2" },
    ]);
    const A5 = A.slice(0, 5);
    const B5 = B.slice(0, 5);
    const first = wtcState(A5, B5, "A", "B", step(0, "a1", "b1", ["a2", "a3"], ["b2", "b3"], "b2", "a2"));
    expect(first.final).toBe(true);
    expect(first.pool.a).toEqual(["a3", "a4", "a5"]);
  });

  it("suggests from our matrix: defender, attackers and which attacker to take", () => {
    const scores: Record<string, Record<string, number>> = {
      a1: { b1: 3, b2: 3, b3: 3 },
      a2: { b1: 5, b2: 1, b3: 2 },
      a3: { b1: 4, b2: 2, b3: 1 },
    };
    const score = (m: string, t: string) => scores[m]?.[t] ?? 3;
    const name = (id: string) => id.toUpperCase();
    const s0 = wtcState(["a1", "a2", "a3"], ["b1", "b2", "b3"], "A", "B", []);
    expect(suggest(s0, "a", score, name)?.players).toEqual(["a1"]);
    const s1 = wtcState(["a1", "a2", "a3"], ["b1", "b2", "b3"], "A", "B", [pick("A", 0, "defender", "a1"), pick("B", 0, "defender", "b1")]);
    expect(suggest(s1, "a", score, name)?.players).toEqual(["a2", "a3"]);
    const s2 = wtcState(["a1", "a2", "a3"], ["b1", "b2", "b3"], "A", "B", [
      ...s1.games.length ? [] : [pick("A", 0, "defender", "a1"), pick("B", 0, "defender", "b1")],
      pick("A", 0, "attackers", "a2", "a3"),
      pick("B", 0, "attackers", "b2", "b3"),
    ]);
    expect(s2.phase).toBe("choice");
    expect(suggest(s2, "a", score, name)?.players).toHaveLength(1);
  });
});
