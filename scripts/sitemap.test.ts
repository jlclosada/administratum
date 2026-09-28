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
});
