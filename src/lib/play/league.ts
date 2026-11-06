/**
 * League calendar: everyone plays everyone once (or home and away), one
 * round ("jornada") every few days. Circle method: one entry stays fixed and
 * the rest rotate; with an odd number, whoever meets the empty slot rests.
 */

export interface LeaguePair {
  a: string;
  /** null: rests this round. */
  b: string | null;
  table: number;
}

export interface LeagueRound {
  number: number;
  /** Last day to play it (YYYY-MM-DD), or null. */
  deadline: string | null;
  pairs: LeaguePair[];
}

export function roundRobin(ids: string[], double = false): [string, string | null][][] {
  if (ids.length < 2) return [];
  const slots: (string | null)[] = ids.length % 2 ? [...ids, null] : [...ids];
  const n = slots.length;
  const rounds: [string, string | null][][] = [];
  let rot = slots.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const line = [slots[0]!, ...rot];
    const pairs: [string | null, string | null][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = line[i]!;
      const y = line[n - 1 - i]!;
      // Alternate who is "home" so nobody is always side A.
      pairs.push((r + i) % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(
      pairs.map(([x, y]) => (x === null ? [y!, null] : [x, y])) as [string, string | null][],
    );
    rot = [rot[rot.length - 1]!, ...rot.slice(0, -1)];
  }
  if (!double) return rounds;
  return [...rounds, ...rounds.map((round) => round.map(([x, y]) => (y === null ? [x, null] : [y, x])) as [string, string | null][])];
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** The full calendar: byes last on each round, deadlines every `roundDays`. */
export function leagueCalendar(ids: string[], opts: { double: boolean; startsOn: string; roundDays: number }): LeagueRound[] {
  return roundRobin(ids, opts.double).map((round, i) => {
    const sorted = [...round.filter(([, b]) => b), ...round.filter(([, b]) => !b)];
    return {
      number: i + 1,
      deadline: opts.startsOn ? addDays(opts.startsOn, (i + 1) * opts.roundDays - 1) : null,
      pairs: sorted.map(([a, b], k) => ({ a, b, table: k + 1 })),
    };
  });
}
