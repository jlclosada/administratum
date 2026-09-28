import { describe, expect, it } from 'vitest';
import { inject, pricingText, renderPath, richText, summarize, type Query } from '../api/render';

// ?raw: import.meta.url isn't a file URL under happy-dom.
import template from '../index.html?raw';

const db: Record<string, Record<string, unknown>[]> = {
  faction_catalog: [
    { faction_slug: 'thousand-sons', faction_name: 'Thousand Sons', detachments: [{ name: 'Grand Coven', dp: null, enhancements: [{ name: 'Athenaean Scrolls', points: 25 }] }], updated_at: '2026-09-28T10:00:00Z' },
  ],
  unit_catalog: [
    { name: 'Rubric Marines', faction_slug: 'thousand-sons', faction_name: 'Thousand Sons', legends: false, pricing: [{ label: '', costs: [{ models: 5, points: 100 }, { models: 10, points: 200 }] }] },
  ],
  tournaments: [{ id: '11111111-1111-4111-8111-111111111111', name: 'GT Prueba', start_date: '2026-10-30', location: 'Talavera', description: 'Gran torneo', status: 'upcoming' }],
};
const q: Query = async (table, query) => {
  const rows = db[table] ?? [];
  const m = query.match(/(?:faction_slug|id)=eq\.([^&]+)/);
  if (!m) return rows;
  const v = decodeURIComponent(m[1]);
  return rows.filter((r) => r.faction_slug === v || r.id === v);
};

describe('prerender', () => {
  it('renders a faction page with units, detachments and breadcrumbs', async () => {
    const page = await renderPath('/catalogo-puntos/thousand-sons', q);
    expect(page?.status).toBe(200);
    expect(page?.title).toBe('Puntos de Thousand Sons · Warhammer 40,000');
    expect(page?.body).toContain('Rubric Marines');
    expect(page?.body).toContain('5 miniaturas: 100 pts, 10 miniaturas: 200 pts');
    expect(page?.body).toContain('Athenaean Scrolls — 25 pts');
  });

  it('404s missing content and leaves editors to the app', async () => {
    expect((await renderPath('/catalogo-puntos/nope', q))?.status).toBe(404);
    expect((await renderPath('/guias/not-a-uuid', q))?.status).toBe(404);
    const editor = await renderPath('/guias/nueva', q);
    expect(editor?.noindex).toBe(true);
    expect(editor?.body).toBe('');
    expect(await renderPath('/dashboard', q)).toBeNull();
  });

  it('adds Event data for tournaments', async () => {
    const page = await renderPath('/competitivo/torneos/11111111-1111-4111-8111-111111111111', q);
    expect(page?.jsonLd?.[0]).toMatchObject({ '@type': 'Event', name: 'GT Prueba', startDate: '2026-10-30' });
  });

  it('injects one set of meta tags, JSON-LD and the content into index.html', async () => {
    const page = (await renderPath('/catalogo-puntos/thousand-sons', q))!;
    const html = inject(template, page);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<title>Puntos de Thousand Sons · Warhammer 40,000 · Administratum</title>');
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('href="https://administratum.site/catalogo-puntos/thousand-sons"');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).toContain('<div id="root"><div data-prerender>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(ld['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['WebSite', 'Organization', 'BreadcrumbList', 'ItemList']);
  });

  it('labels pricing tiers by copy number', () => {
    expect(
      pricingText([
        { label: 'Your 1st To 2nd Units Cost', costs: [{ models: 1, points: 220 }] },
        { label: 'Your 3rd + Unit Costs', costs: [{ models: 1, points: 240 }] },
      ]),
    ).toBe('Las 2 primeras copias: 1 miniatura: 220 pts · Desde la 3.ª copia: 1 miniatura: 240 pts');
  });

  it('escapes user content and renders rich text', () => {
    expect(richText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>x</script>', marks: [{ type: 'bold' }] }] }] })).toBe(
      '<p><strong>&lt;script&gt;x&lt;/script&gt;</strong></p>',
    );
    expect(summarize('a '.repeat(200)).length).toBeLessThanOrEqual(156);
  });
});
