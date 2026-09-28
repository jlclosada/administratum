import { describe, expect, it } from 'vitest';
import type { CommunityList } from '@/types';
import { applyListFilters, winRate, type ListFilters } from './listFilters';

const make = (o: Partial<CommunityList>): CommunityList => ({
  id: o.id ?? 'x', createdAt: '2026-09-01', updatedAt: '', userId: 'u', authorName: 'Ana',
  title: 'Lista', factionName: 'Necrones', totalPoints: 2000, description: '', detachmentName: null,
  listData: { listName: '', totalPoints: 0, factionName: '', detachmentName: null, detachmentPoints: null, categories: [] },
  result: null, tournamentId: null, tournamentName: null, likeCount: 0, commentCount: 0, ...o,
});
const base: ListFilters = { q: '', faction: '', tournament: '', size: 'all', sort: 'recent' };
const lists = [
  make({ id: 'a', title: 'Magnus doble', factionName: 'Mil Hijos', tournamentName: 'Open de Talavera', likeCount: 5, result: '3-2-0', createdAt: '2026-09-03' }),
  make({ id: 'b', title: 'Guerreros', factionName: 'Necrones', totalPoints: 1000, likeCount: 9, commentCount: 4, result: '5-0-0', createdAt: '2026-09-01' }),
  make({ id: 'c', title: 'Waaagh', factionName: 'Orkos', totalPoints: 3000, authorName: 'Bruno', createdAt: '2026-09-02' }),
];
const ids = (f: Partial<ListFilters>) => applyListFilters(lists, { ...base, ...f }, (l) => l.authorName).map((l) => l.id);

describe('applyListFilters', () => {
  it('searches title, faction, tournament and author, ignoring accents and case', () => {
    expect(ids({ q: 'talavera' })).toEqual(['a']);
    expect(ids({ q: 'MIL hijos' })).toEqual(['a']);
    expect(ids({ q: 'bruno' })).toEqual(['c']);
    expect(ids({ q: 'guérreros' })).toEqual(['b']);
  });
  it('filters by faction, tournament and game size', () => {
    expect(ids({ faction: 'Necrones' })).toEqual(['b']);
    expect(ids({ tournament: 'Open de Talavera' })).toEqual(['a']);
    expect(ids({ size: 'incursion' })).toEqual(['b']);
    expect(ids({ size: 'onslaught' })).toEqual(['c']);
  });
  it('sorts by date, likes, comments and results', () => {
    expect(ids({ sort: 'recent' })).toEqual(['a', 'c', 'b']);
    expect(ids({ sort: 'top' })).toEqual(['b', 'a', 'c']);
    expect(ids({ sort: 'discussed' })[0]).toBe('b');
    expect(ids({ sort: 'results' })).toEqual(['b', 'a', 'c']);
  });
});

describe('winRate', () => {
  it('counts draws as half and rejects malformed results', () => {
    expect(winRate('3-1-0')).toBe(0.75);
    expect(winRate('2-0-2')).toBe(0.75);
    expect(winRate('0-0-0')).toBeNull();
    expect(winRate('x')).toBeNull();
  });
});
