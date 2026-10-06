import type { CatalogUpdate } from '@/types';
import { unitSlug } from './seoCopy';

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

/**
 * Unit, faction and page of a points change. Uses the structured columns
 * when present; older rows only have "Unit - Faction" and the faction link.
 */
export function updateTarget(update: CatalogUpdate): { unit: string; faction: string; slug: string | null; href: string } {
  const cut = update.title.lastIndexOf(' - ');
  const unit = update.unitName || (cut > 0 ? update.title.slice(0, cut) : update.title);
  const faction = cut > 0 ? update.title.slice(cut + 3) : '';
  const slug = update.factionSlug || update.link?.match(/^\/catalogo-puntos\/([a-z0-9-]+)/)?.[1] || null;
  return { unit, faction, slug, href: slug ? `/catalogo-puntos/${slug}/${unitSlug(unit)}` : '/catalogo-puntos' };
}

/** Models per option from the description ("…, 5 miniaturas)"), when known. */
export function updateModels(update: CatalogUpdate): number | null {
  const m = update.description.match(/(\d+) miniaturas?\)/);
  return m ? Number(m[1]) : null;
}
