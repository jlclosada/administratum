import { describe, expect, it } from 'vitest';
import type { CatalogUpdate } from '@/types';
import { formatDelta, pointsDeltaOf, updateModels, updateTarget } from './catalogUpdates';

const base: CatalogUpdate = {
  id: '1',
  createdAt: '',
  updatedAt: '',
  gameName: 'Warhammer 40,000',
  type: 'points',
  title: 'Intercessors - Space Marines',
  description: 'Puntos actualizados',
  link: null,
  occurredAt: '',
};

describe('pointsDeltaOf', () => {
  it('prefers the structured column', () => {
    expect(pointsDeltaOf({ ...base, pointsDelta: -10, description: '+15 pts' })).toBe(-10);
  });

  it('falls back to the description of older rows', () => {
    expect(pointsDeltaOf({ ...base, description: 'Puntos actualizados · +15 pts (80 → 95)' })).toBe(15);
    expect(pointsDeltaOf({ ...base, description: 'Puntos actualizados · -5 pts (80 → 75)' })).toBe(-5);
  });

  it('returns null when no change is known, or for downloads', () => {
    expect(pointsDeltaOf(base)).toBeNull();
    expect(pointsDeltaOf({ ...base, type: 'download', pointsDelta: 5 })).toBeNull();
  });
});

describe('formatDelta', () => {
  it('always shows the sign', () => {
    expect(formatDelta(15)).toBe('+15 pts');
    expect(formatDelta(-10)).toBe('−10 pts');
  });
});

describe('updateTarget', () => {
  it('reads the unit columns when present', () => {
    const u = { ...base, title: 'Sorcerer In Terminator Armour - Thousand Sons', unitName: 'Sorcerer In Terminator Armour', factionSlug: 'thousand-sons', link: '/catalogo-puntos/thousand-sons' };
    expect(updateTarget(u)).toEqual({
      unit: 'Sorcerer In Terminator Armour',
      faction: 'Thousand Sons',
      slug: 'thousand-sons',
      href: '/catalogo-puntos/thousand-sons/sorcerer-in-terminator-armour',
    });
  });

  it('falls back to the title and link of older rows', () => {
    const u = { ...base, title: "T'au Commander - T'au Empire", link: '/catalogo-puntos/tau-empire', description: '+5 pts (100 → 105, 1 miniatura)' };
    expect(updateTarget(u)).toMatchObject({ unit: "T'au Commander", faction: "T'au Empire", href: '/catalogo-puntos/tau-empire/tau-commander' });
    expect(updateModels(u)).toBe(1);
    expect(updateModels({ ...u, description: '+15 pts (100 → 115, 5 miniaturas)' })).toBe(5);
    expect(updateTarget({ ...u, link: null })).toMatchObject({ slug: null, href: '/catalogo-puntos' });
  });
});

