import { describe, expect, it } from 'vitest';
import { buildSitemap, collectEntries } from '../api/sitemap';

describe('sitemap', () => {
  it('lists static pages plus public content, and survives a failing source', async () => {
    const entries = await collectEntries(async (table) => {
      if (table === 'faction_catalog') return [{ faction_slug: 'thousand-sons', updated_at: '2026-09-28T10:00:00Z' }];
      if (table === 'articles') return [{ id: 'a1', updated_at: '2026-09-20T10:00:00Z' }];
      if (table === 'painting_guides') throw new Error('down');
      return [];
    });
    const xml = buildSitemap(entries);
    expect(xml).toContain('<loc>https://administratum.site/</loc>');
    expect(xml).toContain('<loc>https://administratum.site/catalogo-puntos/thousand-sons</loc>');
    expect(xml).toContain('<lastmod>2026-09-28</lastmod>');
    expect(xml).toContain('<loc>https://administratum.site/articulos/a1</loc>');
    expect(xml).not.toContain('/guias/');
  });

  it('escapes and de-duplicates', () => {
    const xml = buildSitemap([{ path: '/a?b=1&c=2' }, { path: '/a?b=1&c=2' }]);
    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml).toContain('&amp;c=2');
  });

  it('lists every unit page, paging through the API limit', async () => {
    const calls: string[] = [];
    const entries = await collectEntries(async (table, query) => {
      if (table !== 'unit_catalog') return [];
      calls.push(query);
      const offset = Number(query.match(/offset=(\d+)/)?.[1] ?? 0);
      const total = 1400;
      return Array.from({ length: Math.max(0, Math.min(1000, total - offset)) }, (_, i) => ({
        faction_slug: 'thousand-sons',
        name: i === 0 && offset === 0 ? 'Sorcerer In Terminator Armour' : `Unit ${offset + i}`,
        updated_at: '2026-09-30T10:00:00Z',
      }));
    });
    expect(calls).toHaveLength(2);
    const units = entries.filter((e) => e.path.split('/').length === 4);
    expect(units).toHaveLength(1400);
    expect(units[0].path).toBe('/catalogo-puntos/thousand-sons/sorcerer-in-terminator-armour');
  });
});
