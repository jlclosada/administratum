import { describe, expect, it } from 'vitest';
import * as server from '../api/render';
import { inject, pricingText, renderPath, richText, summarize, type Query } from '../api/render';
import { FACTION_ES } from '../src/lib/factionNames';
import * as app from '../src/lib/seoCopy';

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
    expect(page?.title).toBe('Puntos de Mil Hijos (Thousand Sons) · Warhammer 40K');
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
    expect(html).toContain('<title>Puntos de Mil Hijos (Thousand Sons) · Warhammer 40K · Administratum</title>');
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

  it('uses exactly the same SEO copy as the app', () => {
    expect(server.FACTION_ES).toEqual(FACTION_ES);
    for (const key of ['SEO_CATALOG', 'SEO_COMPETITIVO', 'SEO_COMUNIDAD', 'SEO_GUIAS', 'SEO_DESCARGAS'] as const) {
      expect(server[key]).toEqual(app[key]);
    }
    expect(server.seoFaction('thousand-sons', 'Thousand Sons', 34, 9)).toEqual(app.seoFaction('thousand-sons', 'Thousand Sons', 34, 9));
    expect(server.seoFaction('necrons', 'Necrons', 1, 1)).toEqual(app.seoFaction('necrons', 'Necrons', 1, 1));
    expect(server.seoListTitle('Magnus', 'Mil Hijos', 2000)).toBe(app.seoListTitle('Magnus', 'Mil Hijos', 2000));
    expect(server.seoTournamentTitle('GT', 'Talavera')).toBe(app.seoTournamentTitle('GT', 'Talavera'));
  });
});

describe('tournament Event data', () => {
  const base = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'GT La Letanía del Oso',
    location: 'Alcorcón, Madrid',
    start_date: '2026-10-10',
    end_date: '2026-10-11',
    status: 'upcoming',
    created_at: '2026-09-20T10:00:00Z',
  };
  const url = 'https://administratum.site/competitivo/torneos/x';

  it('parses entry fees', () => {
    expect(server.parseEntryFee('85')).toBe(85);
    expect(server.parseEntryFee('20 €')).toBe(20);
    expect(server.parseEntryFee('12,50€')).toBe(12.5);
    expect(server.parseEntryFee('Gratis')).toBe(0);
    expect(server.parseEntryFee('Consultar')).toBeNull();
    expect(server.parseEntryFee(null)).toBeNull();
  });

  it('includes offers, organizer and performer', () => {
    const ld = server.tournamentJsonLd(
      { ...base, entry_fee: '85', organizer: 'Club La Letanía', external_link: 'https://letania.es/gt', max_players: 50, attendee_count: 12 },
      url,
    );
    expect(ld.organizer).toEqual({ '@type': 'Organization', name: 'Club La Letanía', url: 'https://letania.es/gt' });
    expect(ld.performer).toMatchObject({ '@type': 'PerformingGroup' });
    expect(ld.offers).toEqual({
      '@type': 'Offer',
      url: 'https://letania.es/gt',
      price: 85,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      validFrom: '2026-09-20T10:00:00Z',
    });
    expect(ld.location).toMatchObject({ address: { addressLocality: 'Alcorcón, Madrid', addressCountry: 'ES' } });
  });

  it('marks closed or full tournaments as sold out and never uses free text as a URL', () => {
    const closed = server.tournamentJsonLd({ ...base, registration_closed: true, external_link: 'Inscripción cerrada' }, url);
    expect(closed.offers).toMatchObject({ url, availability: 'https://schema.org/SoldOut' });
    expect(closed.offers).not.toHaveProperty('price');
    expect(closed.organizer).toBeUndefined();
    const full = server.tournamentJsonLd({ ...base, max_players: 2, attendee_count: 2 }, url);
    expect(full.offers).toMatchObject({ availability: 'https://schema.org/SoldOut' });
  });
});
