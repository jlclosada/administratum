import { describe, expect, it } from "vitest";
import {
  analyzeMatrix,
  hasContent,
  resultStats,
  decodeMatrix,
  encodeMatrix,
  isComplete,
  newMatrix,
  optimalAssignment,
  resizeMatrix,
  summaryText,
  type Matrix,
  type Score,
} from "./matrix";

function sample(grid: number[][]): Matrix {
  const m = newMatrix(grid.length as 4, "m1");
  m.ourTeam = "Los Osos";
  m.rivalTeam = "Lobos";
  m.ours = ["Ana", "Bea", "Carlos", "Dani"].map((name, i) => ({ name, faction: ["Thousand Sons", "Necrons", "Orks", "Aeldari"][i]! }));
  m.theirs = ["Rubén", "Sara", "Tomás", "Úrsula"].map((name, i) => ({ name, faction: ["Tyranids", "Custodes", "Drukhari", "Space Wolves"][i]! }));
  m.scores = grid.map((r) => r.map((s) => s as Score));
  return m;
}

describe("optimalAssignment", () => {
  it("finds the best and worst one-to-one line-ups", () => {
    const g = [
      [5, 1, 1],
      [1, 5, 1],
      [1, 1, 5],
    ];
    expect(optimalAssignment(g)).toEqual({ pairs: [0, 1, 2], total: 15 });
    expect(optimalAssignment(g, "min").total).toBe(3);
  });

  it("matches brute force on 6x6", () => {
    const g = Array.from({ length: 6 }, (_, i) => Array.from({ length: 6 }, (_, j) => ((i * 7 + j * 3) % 5) + 1));
    const perms = (xs: number[]): number[][] => (xs.length ? xs.flatMap((x) => perms(xs.filter((y) => y !== x)).map((p) => [x, ...p])) : [[]]);
    const all = perms([0, 1, 2, 3, 4, 5]).map((p) => p.reduce((s, j, i) => s + g[i]![j]!, 0));
    expect(optimalAssignment(g).total).toBe(Math.max(...all));
    expect(optimalAssignment(g, "min").total).toBe(Math.min(...all));
  });
});

describe("analyzeMatrix", () => {
  const m = sample([
    [3, 4, 3, 4], // Ana: solid everywhere → defender
    [5, 1, 2, 3], // Bea: one ace, risky
    [2, 1, 4, 1], // Carlos: bad against most
    [4, 2, 3, 5],
  ]);
  const a = analyzeMatrix(m);

  it("picks as defender whoever keeps the best second-worst matchup", () => {
    expect(a.defender).toBe(0);
    expect(a.players[0]!.defenderValue).toBe(3);
    expect(a.recommendations[0]!.title).toBe("Defensor: Ana (Thousand Sons)");
  });

  it("predicts the rival defender and our two attackers against it", () => {
    // Against Sara (col 1) our best answers are 4 (Ana) and 2 (Dani).
    expect(a.likelyRivalDefender).toBe(1);
    expect(a.rivals[1]!.attackers).toEqual([0, 3]);
    expect(a.rivals[1]!.attackValue).toBe(2);
  });

  it("flags aces, players to protect and the best/worst totals", () => {
    expect(a.recommendations.some((r) => r.kind === "ace" && r.title === "Baza: Bea contra Rubén")).toBe(true);
    expect(a.recommendations.some((r) => r.kind === "protect" && r.title.startsWith("Protege a Carlos"))).toBe(true);
    expect(a.best.total).toBe(18); // Ana-Sara 4, Bea-Rubén 5, Carlos-Tomás 4, Dani-Úrsula 5
    expect(a.best.pairs).toEqual([1, 0, 2, 3]);
    expect(a.worst.total).toBeLessThan(a.best.total);
  });

  it("flags lists nobody beats", () => {
    const hard = analyzeMatrix(sample([
      [2, 4, 3, 4],
      [1, 5, 3, 3],
      [2, 3, 4, 3],
      [1, 4, 3, 5],
    ]));
    expect(hard.recommendations.find((r) => r.kind === "danger")?.title).toBe("Lista peligrosa: Rubén (Tyranids)");
  });

  it("writes a chat-ready summary", () => {
    const text = summaryText(m, a, "https://administratum.site/competitivo/matrices/compartida#x");
    expect(text).toContain("Los Osos vs Lobos");
    expect(text).toContain("Bea vs Rubén → 5");
    expect(text).toContain("https://administratum.site/competitivo/matrices/compartida#x");
  });
});

describe("matrix helpers", () => {
  it("round-trips through the share code, accents included", () => {
    const m = sample([
      [3, 4, 3, null as unknown as number],
      [5, 1, 2, 3],
      [2, 1, 4, 1],
      [4, 2, 3, 5],
    ]);
    m.title = "ETC · Ronda 2 ñ";
    const copy = decodeMatrix(encodeMatrix(m), "copy")!;
    expect(copy.id).toBe("copy");
    expect(copy.title).toBe(m.title);
    expect(copy.ours).toEqual(m.ours);
    expect(copy.scores).toEqual(m.scores);
    expect(isComplete(copy)).toBe(false);
  });

  it("rejects broken links", () => {
    expect(decodeMatrix("nope")).toBeNull();
    expect(decodeMatrix(btoa(JSON.stringify([1, "", "", "", [], [], ""])))).toBeNull();
  });

  it("resizes keeping what fits", () => {
    const m = sample([
      [3, 4, 3, 4],
      [5, 1, 2, 3],
      [2, 1, 4, 1],
      [4, 2, 3, 5],
    ]);
    const big = resizeMatrix(m, 6);
    expect(big.ours).toHaveLength(6);
    expect(big.scores[0]!).toEqual([3, 4, 3, 4, null, null]);
    expect(resizeMatrix(big, 3).scores).toEqual([
      [3, 4, 3],
      [5, 1, 2],
      [2, 1, 4],
    ]);
  });
});

describe("results", () => {
  const m = sample([
    [3, 4, 3, 4],
    [5, 1, 2, 3],
    [2, 1, 4, 1],
    [4, 2, 3, 5],
  ]);

  it("counts the record, the team result and how well the matrix called it", () => {
    m.results = [
      { rival: 1, outcome: "win", ours: 15, theirs: 5 }, // predicted 4 → hit
      { rival: 0, outcome: "loss", ours: 8, theirs: 12 }, // predicted 5 → miss
      { rival: 2, outcome: "draw", ours: 10, theirs: 10 }, // predicted 4 → miss
      { rival: 3, outcome: "win", ours: 13, theirs: 7 }, // predicted 5 → hit
    ];
    expect(resultStats(m)).toEqual({ played: 4, wins: 2, draws: 1, losses: 1, points: { ours: 46, theirs: 34 }, team: "win", called: 4, right: 2 });
  });

  it("decides by wins without points, and ignores unplayed tables", () => {
    m.results = [
      { rival: 1, outcome: "loss", ours: null, theirs: null },
      { rival: 0, outcome: "loss", ours: 3, theirs: null },
      { rival: null, outcome: null, ours: null, theirs: null },
      { rival: 3, outcome: "win", ours: null, theirs: null },
    ];
    const r = resultStats(m);
    expect(r.points).toBeNull();
    expect(r.team).toBe("loss");
    expect(r.played).toBe(3);
  });

  it("knows when a matrix is still blank", () => {
    expect(hasContent(newMatrix(4))).toBe(false);
    expect(hasContent({ ...newMatrix(4), rivalTeam: "Lobos" })).toBe(true);
  });
});

