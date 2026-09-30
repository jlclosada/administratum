import { describe, expect, it } from 'vitest';
import { canonicalJson, sameJson } from './catalog.mjs';
import { diffCatalog, rowChanged, updateEntry } from './syncCore.mjs';

const pricing = (first, third) => [
  { range: '[1,2]', label: 'Your 1st To 2nd Units Cost', costs: [{ models: 1, points: first }] },
  { range: '[3,)', label: 'Your 3rd + Unit Costs', costs: [{ models: 1, points: third }] },
];
const row = (name, p) => ({
  game_name: 'Warhammer 40,000',
  faction_slug: 'thousand-sons',
  faction_name: 'Thousand Sons',
  name,
  pricing: p,
  wargear: [],
  mfm_version: '1.5',
});
// What Postgres jsonb hands back: same data, keys in a different order.
const stored = (r, id) => ({
  id,
  mfm_version: r.mfm_version,
  wargear: r.wargear,
  pricing: r.pricing.map((t) => ({ costs: t.costs.map((c) => ({ points: c.points, models: c.models })), label: t.label, range: t.range })),
  name: r.name,
  faction_name: r.faction_name,
  faction_slug: r.faction_slug,
  game_name: r.game_name,
});

describe('MFM sync diff', () => {
  it('ignores key order (jsonb) when comparing', () => {
    expect(sameJson({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 })).toBe(true);
    expect(canonicalJson({ b: 1, a: undefined })).toBe('{"b":1}');
    const r = row('Sorcerer', pricing(95, 105));
    expect(rowChanged(stored(r, 'x'), r)).toBe(false);
  });

  it('detects a points change like Sorcerer in Terminator Armour 100 → 110', () => {
    const before = row('Sorcerer In Terminator Armour', pricing(100, 110));
    const after = row('Sorcerer In Terminator Armour', pricing(110, 120));
    const same = row('Tzaangors', pricing(65, 65));
    const fresh = row('Nuevo Personaje', pricing(80, 90));
    const { added, repriced, toUpsert } = diffCatalog([stored(before, 'a'), stored(same, 'b')], [after, same, fresh]);
    expect(added.map((r) => r.name)).toEqual(['Nuevo Personaje']);
    expect(repriced.map((r) => r.id)).toEqual(['a']);
    expect(toUpsert.map((r) => r.name)).toEqual(['Sorcerer In Terminator Armour', 'Nuevo Personaje']);
    expect(updateEntry(repriced[0].old, repriced[0].row)).toMatchObject({
      title: 'Sorcerer In Terminator Armour - Thousand Sons',
      description: '+10 pts (100 → 110, 1 miniatura)',
      points_before: 100,
      points_after: 110,
      points_delta: 10,
    });
  });

  it('re-upserts rows whose other fields changed without logging a points change', () => {
    const before = row('Sorcerer', pricing(95, 105));
    const after = { ...row('Sorcerer', pricing(95, 105)), mfm_version: '1.6' };
    const { repriced, toUpsert } = diffCatalog([stored(before, 'a')], [after]);
    expect(repriced).toEqual([]);
    expect(toUpsert).toHaveLength(1);
  });
});
