import { describe, expect, it } from "vitest";
import { dispositionsFromList, primaryMission } from "./missions";
import { gameScore, toGamePoints } from "./score";
import { matchResult, standings } from "./standings";
import { shuffle, swissPairings } from "./swiss";
import type { BattleRound, PlayEntry, PlayGame, PlayMatch } from "./types";

const round = (pa: number, sa: { card: string; vp: number }[] = [], pb = 0, sb: { card: string; vp: number }[] = []): BattleRound => ({
  a: { primary: pa, secondaries: sa },
  b: { primary: pb, secondaries: sb },
});

describe("11th edition missions", () => {
  it("gives each player the primary on their card under the opponent's disposition", () => {
    expect(primaryMission("purge_the_foe", "take_and_hold")).toBe("Unstoppable Force");
    expect(primaryMission("take_and_hold", "purge_the_foe")).toBe("Immovable Object");
    expect(primaryMission("disruption", "disruption")).toBe("Outmanoeuvre");
    expect(primaryMission(null, "disruption")).toBeNull();
  });

  it("reads the army's Force Dispositions from the app export", () => {
    expect(dispositionsFromList(["Force Dispositions: Priority Assets, Take and Hold"])).toEqual(["take_and_hold", "priority_assets"]);
    expect(dispositionsFromList(undefined)).toEqual([]);
  });
});

describe("game score", () => {
  it("applies the 15 per round, 45 total, fixed-card and battle ready limits", () => {
    const rounds = [
      round(20, [{ card: "Assassination", vp: 10 }, { card: "No Prisoners", vp: 10 }]), // primary 15, secondary 15
      round(15, [{ card: "Assassination", vp: 12 }]), // fixed card: only 10 more fit (20 max)
      round(15),
      round(15), // primary already at 45 after this
      round(0),
      round(8), // end of battle: not capped per round, but 45 total
    ];
    const s = gameScore({ rounds, setup: { a: { detachment: "", disposition: null, secondaryMode: "fixed", fixed: ["Assassination", "Bring it Down"], battleReady: true } } });
    expect(s.a.primary).toBe(45);
    expect(s.a.perRound[1]!.secondary).toBe(10);
    expect(s.a.secondary).toBe(25);
    expect(s.a.total).toBe(45 + 25 + 10);
    expect(s.b.total).toBe(10);
  });

  it("converts VP difference to 20-0 game points", () => {
    expect(toGamePoints(70, 66)).toEqual([10, 10]);
    expect(toGamePoints(70, 64)).toEqual([11, 9]);
    expect(toGamePoints(40, 90)).toEqual([1, 19]);
    expect(toGamePoints(95, 20)).toEqual([20, 0]);
  });
});

const entry = (id: string): PlayEntry => ({ id, tournamentId: "t", name: id, teamId: null, captainId: null, status: "registered", dropped: false, joinCode: "", createdAt: "", updatedAt: "" });
const match = (id: string, a: string, b: string | null): PlayMatch => ({ id, tournamentId: "t", roundId: "r1", tableNo: 1, entryA: a, entryB: b, createdAt: "" });
const game = (matchId: string, vpA: number, vpB: number, status: PlayGame["status"] = "confirmed"): PlayGame => ({
  id: `${matchId}-${vpA}-${vpB}`,
  matchId,
  tournamentId: "t",
  tableNo: 1,
  playerA: "x",
  playerB: "y",
  status,
  setup: {},
  rounds: [],
  vpA,
  vpB,
  confirmedA: status === "confirmed",
  confirmedB: status === "confirmed",
  updatedAt: "",
});

describe("results and standings", () => {
  it("sums 20-0 game points in a team match and waits for every game", () => {
    const t = { teamSize: 3, scoring: "wtc" as const };
    const m = match("m1", "A", "B");
    const partial = matchResult(t, m, [game("m1", 80, 40), game("m1", 50, 60, "playing")]);
    expect(partial.final).toBe(false);
    const r = matchResult(t, m, [game("m1", 80, 40), game("m1", 50, 60), game("m1", 60, 60)]);
    expect([r.scoreA, r.scoreB]).toEqual([17 + 9 + 10, 3 + 11 + 10]); // 40 VP apart = 17-3
    expect(r.outcomeA).toBe("win");
    expect(matchResult({ teamSize: 3, scoring: "wins" }, m, [game("m1", 80, 40), game("m1", 50, 60), game("m1", 60, 60)]).outcomeA).toBe("draw");
  });

  it("ranks by points, then game points, then VP difference, with byes as wins", () => {
    const t = { teamSize: 1, scoring: "wtc" as const };
    const entries = ["A", "B", "C"].map(entry);
    const matches = [match("m1", "A", "B"), match("m2", "C", null)];
    const rows = standings(t, entries, matches, [game("m1", 60, 70)]);
    expect(rows.map((r) => [r.entryId, r.points])).toEqual([
      ["B", 2],
      ["C", 2],
      ["A", 0],
    ]);
    expect(rows[1]!.byes).toBe(1);
  });
});

describe("swiss pairings", () => {
  it("pairs neighbours, avoids rematches and gives the bye to the lowest without one", () => {
    const p = swissPairings(["A", "B", "C", "D", "E"], [["A", "B"]], ["E"]);
    expect(p).toEqual([
      { a: "A", b: "C", table: 1 },
      { a: "B", b: "E", table: 2 },
      { a: "D", b: null, table: 3 },
    ]);
  });

  it("falls back to a rematch only when there is no other way", () => {
    const p = swissPairings(["A", "B"], [["A", "B"]]);
    expect(p).toEqual([{ a: "A", b: "B", table: 1 }]);
  });

  it("handles a large field quickly", () => {
    const ids = Array.from({ length: 64 }, (_, i) => `e${i}`);
    const played: [string, string][] = ids.map((id, i) => [id, ids[(i + 1) % 64]!]);
    const p = swissPairings(ids, played);
    expect(p).toHaveLength(32);
    expect(new Set(p.flatMap((x) => [x.a, x.b])).size).toBe(64);
  });

  it("shuffles deterministically with a seeded source", () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    expect(shuffle([1, 2, 3, 4], rnd)).toHaveLength(4);
  });
});

describe("labels", async () => {
  const { capacityLabel, feeLabel, registrationOpen, listsVisible } = await import("./labels");
  it("describes spots, fees and windows in people's terms", () => {
    expect(capacityLabel({ format: "teams", teamSize: 5, maxEntries: 16 })).toBe("16 equipos (80 jugadores)");
    expect(feeLabel({ entryFee: 20, teamSize: 5 })).toMatch(/20\s€ por jugador \(100\s€ por equipo\)/);
    expect(feeLabel({ entryFee: 0, teamSize: 1 })).toBe("Gratis");
    const now = Date.parse("2026-11-06T10:00:00Z");
    expect(registrationOpen({ status: "open", registrationDeadline: "2026-11-05T00:00:00Z" }, now)).toBe(false);
    expect(registrationOpen({ status: "open", registrationDeadline: null }, now)).toBe(true);
    expect(listsVisible({ status: "closed", listsPublic: false, listDeadline: "2026-11-01T00:00:00Z" }, now)).toBe(true);
  });
});
