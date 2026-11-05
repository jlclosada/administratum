/**
 * Team pairing matrices for Warhammer 40K team events (WTC / ETC style).
 *
 * Each of our players rates every rival list from 1 (very unfavourable) to
 * 5 (very favourable). From that grid we work out who should defend, who to
 * send as attackers, which rival lists are dangerous and the best and worst
 * possible line-ups. Matrices live in the browser (no account needed) and
 * can be shared as a link.
 */

export const MATRIX_SIZES = [3, 4, 5, 6, 8] as const;
export type MatrixSize = (typeof MATRIX_SIZES)[number];

export type Score = 1 | 2 | 3 | 4 | 5;

export const SCORE_LABEL: Record<Score, string> = {
  1: "Muy desfavorable",
  2: "Desfavorable",
  3: "Igualado",
  4: "Favorable",
  5: "Muy favorable",
};

export interface MatrixPlayer {
  name: string;
  /** Faction name as in the points catalog ("Thousand Sons"). */
  faction: string;
}

export interface Matrix {
  id: string;
  /** Event or round, e.g. "WTC 2026 · Ronda 3". */
  title: string;
  ourTeam: string;
  rivalTeam: string;
  ours: MatrixPlayer[];
  theirs: MatrixPlayer[];
  /** scores[i][j]: our player i against rival list j; null = not rated yet. */
  scores: (Score | null)[][];
  createdAt: string;
  updatedAt: string;
}

const emptyPlayers = (n: number): MatrixPlayer[] => Array.from({ length: n }, () => ({ name: "", faction: "" }));

export function newMatrix(size: MatrixSize, id: string = crypto.randomUUID()): Matrix {
  const now = new Date().toISOString();
  return {
    id,
    title: "",
    ourTeam: "",
    rivalTeam: "",
    ours: emptyPlayers(size),
    theirs: emptyPlayers(size),
    scores: Array.from({ length: size }, () => Array<Score | null>(size).fill(null)),
    createdAt: now,
    updatedAt: now,
  };
}

/** Changes the team size, keeping whatever fits. */
export function resizeMatrix(m: Matrix, size: number): Matrix {
  const fit = <T,>(list: T[], make: () => T) => Array.from({ length: size }, (_, i) => list[i] ?? make());
  return {
    ...m,
    ours: fit(m.ours, () => ({ name: "", faction: "" })),
    theirs: fit(m.theirs, () => ({ name: "", faction: "" })),
    scores: fit(m.scores, () => Array<Score | null>(size).fill(null)).map((row) => fit(row, () => null)),
  };
}

export const playerLabel = (p: MatrixPlayer, i: number, side: "ours" | "theirs") =>
  p.name.trim() || (side === "ours" ? `Jugador ${i + 1}` : `Rival ${i + 1}`);

export function isSetupComplete(m: Matrix): boolean {
  return [...m.ours, ...m.theirs].every((p) => p.faction);
}

export function filledCount(m: Matrix): number {
  return m.scores.flat().filter((s) => s !== null).length;
}

export function isComplete(m: Matrix): boolean {
  return filledCount(m) === m.ours.length * m.theirs.length;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface PlayerStats {
  index: number;
  avg: number;
  min: number;
  max: number;
  /** What a defender keeps when the rival offers its two worst matchups. */
  defenderValue: number;
  good: number;
  bad: number;
}

export interface RivalStats {
  index: number;
  /** Our average against this list (low = dangerous for us). */
  avg: number;
  best: number;
  /** Our two best answers (best first). */
  attackers: number[];
  /** What we keep if they defend with this list (they refuse our better attacker). */
  attackValue: number;
}

export interface Assignment {
  /** pairs[i] = rival index our player i faces. */
  pairs: number[];
  total: number;
}

export interface Recommendation {
  kind: "defender" | "attack" | "danger" | "ace" | "protect";
  title: string;
  text: string;
}

export interface MatrixAnalysis {
  average: number;
  verdict: { label: string; tone: "good" | "even" | "bad" };
  players: PlayerStats[];
  rivals: RivalStats[];
  defender: number;
  likelyRivalDefender: number;
  best: Assignment;
  worst: Assignment;
  recommendations: Recommendation[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const asc = (xs: number[]) => [...xs].sort((a, b) => a - b);
/** Second lowest (or the only value with one player). */
const secondLowest = (xs: number[]) => asc(xs)[Math.min(1, xs.length - 1)]!;
const secondHighest = (xs: number[]) => asc(xs).reverse()[Math.min(1, xs.length - 1)]!;

/** Best (or worst) one-to-one line-up, by dynamic programming over subsets. */
export function optimalAssignment(scores: number[][], mode: "max" | "min" = "max"): Assignment {
  const n = scores.length;
  const better = (a: number, b: number) => (mode === "max" ? a > b : a < b);
  const size = 1 << n;
  const value = new Array<number>(size).fill(mode === "max" ? -Infinity : Infinity);
  const choice = new Array<number>(size).fill(-1);
  value[0] = 0;
  for (let mask = 0; mask < size; mask++) {
    if (!Number.isFinite(value[mask]!)) continue;
    const i = popcount(mask); // next of our players to pair
    if (i >= n) continue;
    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) continue;
      const next = mask | (1 << j);
      const v = value[mask]! + scores[i]![j]!;
      if (better(v, value[next]!)) {
        value[next] = v;
        choice[next] = j;
      }
    }
  }
  const pairs = new Array<number>(n);
  let mask = size - 1;
  for (let i = n - 1; i >= 0; i--) {
    const j = choice[mask]!;
    pairs[i] = j;
    mask &= ~(1 << j);
  }
  return { pairs, total: value[size - 1]! };
}

function popcount(x: number): number {
  let c = 0;
  for (; x; x &= x - 1) c++;
  return c;
}

/** Everything the summary shows. Unrated cells count as 3 (even). */
export function analyzeMatrix(m: Matrix): MatrixAnalysis {
  const grid: number[][] = m.scores.map((row) => row.map((s) => s ?? 3));
  const n = grid.length;
  const ours = (i: number) => playerLabel(m.ours[i]!, i, "ours");
  const theirs = (j: number) => playerLabel(m.theirs[j]!, j, "theirs");
  const withFaction = (p: MatrixPlayer, label: string) => (p.faction ? `${label} (${p.faction})` : label);
  const oursF = (i: number) => withFaction(m.ours[i]!, ours(i));
  const theirsF = (j: number) => withFaction(m.theirs[j]!, theirs(j));

  const players: PlayerStats[] = grid.map((row, index) => ({
    index,
    avg: avg(row),
    min: Math.min(...row),
    max: Math.max(...row),
    defenderValue: secondLowest(row),
    good: row.filter((s) => s >= 4).length,
    bad: row.filter((s) => s <= 2).length,
  }));
  const rivals: RivalStats[] = Array.from({ length: n }, (_, j) => {
    const col = grid.map((row) => row[j]!);
    const attackers = col
      .map((s, i) => ({ s, i }))
      .sort((a, b) => b.s - a.s || players[b.i]!.avg - players[a.i]!.avg)
      .slice(0, 2)
      .map((x) => x.i);
    return { index: j, avg: avg(col), best: Math.max(...col), attackers, attackValue: secondHighest(col) };
  });

  const defender = [...players].sort((a, b) => b.defenderValue - a.defenderValue || b.avg - a.avg || b.min - a.min)[0]!.index;
  const likelyRivalDefender = [...rivals].sort((a, b) => a.attackValue - b.attackValue || a.avg - b.avg)[0]!.index;
  const best = optimalAssignment(grid, "max");
  const worst = optimalAssignment(grid, "min");
  const average = avg(grid.flat());
  const verdict: MatrixAnalysis["verdict"] =
    average >= 3.4 ? { label: "Cruce favorable", tone: "good" } : average > 2.6 ? { label: "Cruce igualado", tone: "even" } : { label: "Cruce cuesta arriba", tone: "bad" };

  const recs: Recommendation[] = [];
  const d = players[defender]!;
  recs.push({
    kind: "defender",
    title: `Defensor: ${oursF(defender)}`,
    text:
      n > 1
        ? `Aunque el rival le ofrezca sus dos peores cruces, se queda con un emparejamiento de ${d.defenderValue} (${SCORE_LABEL[d.defenderValue as Score].toLowerCase()}). Es el jugador más difícil de castigar.`
        : `Es tu único jugador.`,
  });
  if (n > 1) {
    const r = rivals[likelyRivalDefender]!;
    recs.push({
      kind: "attack",
      title: `Si defienden con ${theirsF(likelyRivalDefender)}`,
      text: `Es su defensor más probable: contra esa lista tu equipo tiene pocas respuestas. Manda como atacantes a ${r.attackers.map(oursF).join(" y ")}; aunque rechacen al mejor, te quedas con un ${r.attackValue}.`,
    });
  }
  for (const r of rivals.filter((r) => r.best <= 2)) {
    const answer = r.attackers[0]!;
    recs.push({
      kind: "danger",
      title: `Lista peligrosa: ${theirsF(r.index)}`,
      text: `Nadie de tu equipo tiene un buen cruce contra ella. Si te toca asumirla, que la juegue ${oursF(answer)}, que es quien menos sufre (${grid[answer]![r.index]}).`,
    });
  }
  const aces = grid.flatMap((row, i) => row.map((s, j) => ({ s, i, j }))).filter((c) => c.s === 5);
  for (const c of aces.slice(0, 3)) {
    recs.push({
      kind: "ace",
      title: `Baza: ${ours(c.i)} contra ${theirs(c.j)}`,
      text: `Cruce muy favorable. Ofrécelo como atacante si ${theirsF(c.j)} sale de defensor, y no lo gastes contra otra lista.`,
    });
  }
  for (const p of players.filter((p) => p.index !== defender && p.bad > n / 2)) {
    const target = grid[p.index]!.indexOf(p.max);
    recs.push({
      kind: "protect",
      title: `Protege a ${oursF(p.index)}`,
      text: `Tiene ${p.bad} cruces malos de ${n}. No lo expongas como defensor; úsalo de atacante contra ${theirsF(target)}, su mejor emparejamiento (${p.max}).`,
    });
  }

  return { average, verdict, players, rivals, defender, likelyRivalDefender, best, worst, recommendations: recs };
}

/** Plain-text summary to paste in the team's chat. */
export function summaryText(m: Matrix, a: MatrixAnalysis, url?: string): string {
  const ours = (i: number) => playerLabel(m.ours[i]!, i, "ours");
  const theirs = (j: number) => playerLabel(m.theirs[j]!, j, "theirs");
  const header = [m.title, `${m.ourTeam || "Mi equipo"} vs ${m.rivalTeam || "Rival"}`].filter(Boolean).join(" · ");
  const n = m.ours.length;
  return [
    `🎯 Matriz ${header}`,
    `${a.verdict.label} · media ${a.average.toFixed(1)} sobre 5`,
    "",
    ...a.recommendations.map((r) => `• ${r.title}: ${r.text}`),
    "",
    `Emparejamiento ideal (${a.best.total}/${n * 5}):`,
    ...a.best.pairs.map((j, i) => `  ${ours(i)} vs ${theirs(j)} → ${m.scores[i]?.[j] ?? 3}`),
    `En el peor caso: ${a.worst.total}/${n * 5}`,
    url ? `\n${url}` : "",
  ]
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Storage (this browser) and sharing
// ---------------------------------------------------------------------------

const KEY = "adm-matrices-v1";

export function loadMatrices(): Matrix[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as Matrix[];
    return Array.isArray(list) ? list.filter(isMatrix).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  } catch {
    return [];
  }
}

export function saveMatrix(m: Matrix): void {
  const list = loadMatrices().filter((x) => x.id !== m.id);
  try {
    localStorage.setItem(KEY, JSON.stringify([{ ...m, updatedAt: new Date().toISOString() }, ...list].slice(0, 50)));
  } catch {
    // Private mode or full storage: the matrix still works for this visit.
  }
}

export function deleteMatrix(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadMatrices().filter((x) => x.id !== id)));
  } catch {
    // Nothing to do.
  }
}

function isMatrix(x: unknown): x is Matrix {
  const m = x as Matrix;
  const n = m?.ours?.length;
  return (
    !!m &&
    typeof m.id === "string" &&
    MATRIX_SIZES.includes(n as MatrixSize) &&
    m.theirs?.length === n &&
    Array.isArray(m.scores) &&
    m.scores.length === n &&
    m.scores.every((row) => Array.isArray(row) && row.length === n && row.every((s) => s === null || (Number.isInteger(s) && s >= 1 && s <= 5)))
  );
}

const toB64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

/** Compact, URL-safe copy of a matrix (for the share link's #hash). */
export function encodeMatrix(m: Matrix): string {
  const p = (x: MatrixPlayer) => [x.name, x.faction];
  return toB64Url(JSON.stringify([1, m.title, m.ourTeam, m.rivalTeam, m.ours.map(p), m.theirs.map(p), m.scores.map((r) => r.map((s) => s ?? 0).join("")).join(".")]));
}

/** Reads a shared matrix as a new copy, or null if the link is broken. */
export function decodeMatrix(code: string, id: string = crypto.randomUUID()): Matrix | null {
  try {
    const [v, title, ourTeam, rivalTeam, ours, theirs, grid] = JSON.parse(fromB64Url(code));
    if (v !== 1) return null;
    const pl = (list: [string, string][]) => list.map(([name, faction]) => ({ name: String(name).slice(0, 60), faction: String(faction).slice(0, 80) }));
    const now = new Date().toISOString();
    const m: Matrix = {
      id,
      title: String(title).slice(0, 120),
      ourTeam: String(ourTeam).slice(0, 80),
      rivalTeam: String(rivalTeam).slice(0, 80),
      ours: pl(ours),
      theirs: pl(theirs),
      scores: String(grid)
        .split(".")
        .map((row) => [...row].map((c) => (c === "0" ? null : (Number(c) as Score)))),
      createdAt: now,
      updatedAt: now,
    };
    return isMatrix(m) ? m : null;
  } catch {
    return null;
  }
}
