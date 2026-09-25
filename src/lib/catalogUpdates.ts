import type { CatalogUpdate } from '@/types';

/**
 * Signed point change of a 'points' update. Uses the structured column when
 * present, falling back to the "+15 pts" text that older sync runs wrote
 * into the description.
 */
export function pointsDeltaOf(update: CatalogUpdate): number | null {
  if (update.type !== 'points') return null;
  if (typeof update.pointsDelta === 'number') return update.pointsDelta;
  const match = update.description.match(/([+-−]\s?\d+)\s*pts/);
  if (!match) return null;
  const value = Number(match[1]!.replace('−', '-').replace(/\s/g, ''));
  return Number.isNaN(value) || value === 0 ? null : value;
}

export function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} pts`;
}
