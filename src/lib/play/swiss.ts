/**
 * Swiss pairings: entries with the same record meet, nobody plays the same
 * opponent twice when it can be avoided, and with an odd number the lowest
 * ranked entry without a bye gets one. Round 1 is a random draw.
 */

export interface Pairing {
  a: string;
  /** null: bye. */
  b: string | null;
  table: number;
}

const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

/** Fisher–Yates with an injectable random source (tests use a seeded one). */
export function shuffle<T>(xs: T[], random: () => number = Math.random): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * @param ranked entry ids, best first (current standings; any order for round 1)
 * @param played pairs that already met, as [a, b]
 * @param byes entries that already had a bye
 */
export function swissPairings(ranked: string[], played: [string, string][] = [], byes: string[] = []): Pairing[] {
  const met = new Set(played.map(([a, b]) => key(a, b)));
  let pool = [...ranked];
  let bye: string | null = null;
  if (pool.length % 2 === 1) {
    const hadBye = new Set(byes);
    bye = [...pool].reverse().find((id) => !hadBye.has(id)) ?? pool[pool.length - 1]!;
    pool = pool.filter((id) => id !== bye);
  }

  // Backtracking, with a budget so a big field can never hang the page.
  let budget = 200_000;
  const solve = (left: string[], allowRematch: boolean): [string, string][] | null => {
    if (left.length === 0) return [];
    if (--budget < 0) return null;
    const [first, ...rest] = left;
    for (let i = 0; i < rest.length; i++) {
      const opp = rest[i]!;
      if (!allowRematch && met.has(key(first!, opp))) continue;
      const tail = solve([...rest.slice(0, i), ...rest.slice(i + 1)], allowRematch);
      if (tail) return [[first!, opp], ...tail];
    }
    return null;
  };

  let pairs = solve(pool, false);
  if (!pairs) {
    budget = 200_000;
    pairs = solve(pool, true) ?? [];
  }
  const out: Pairing[] = pairs.map(([a, b], i) => ({ a, b, table: i + 1 }));
  if (bye) out.push({ a: bye, b: null, table: out.length + 1 });
  return out;
}
