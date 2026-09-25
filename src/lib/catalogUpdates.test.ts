import { describe, expect, it } from 'vitest';
import type { CatalogUpdate } from '@/types';
import { formatDelta, pointsDeltaOf } from './catalogUpdates';

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
