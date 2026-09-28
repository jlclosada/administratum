// Vercel function behind /sitemap.xml (see vercel.json): lists every public
// page, reading the database with the public anon key, so new articles,
// guides, lists and tournaments are discoverable without a redeploy.
//
// Self-contained on purpose: Vercel compiles each function file on its own.

export const SITE = 'https://administratum.site';

export interface SitemapEntry {
  path: string;
  lastmod?: string | null;
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

/** Pages that always exist, whatever is in the database. */
export const STATIC_ENTRIES: SitemapEntry[] = [
  { path: '/', changefreq: 'weekly', priority: 1 },
  { path: '/catalogo-puntos', changefreq: 'daily', priority: 0.9 },
  { path: '/competitivo', changefreq: 'daily', priority: 0.8 },
  { path: '/comunidad', changefreq: 'daily', priority: 0.8 },
  { path: '/guias', changefreq: 'weekly', priority: 0.8 },
  { path: '/descargas', changefreq: 'weekly', priority: 0.6 },
  { path: '/legal/aviso-legal', changefreq: 'yearly', priority: 0.1 },
  { path: '/legal/privacidad', changefreq: 'yearly', priority: 0.1 },
  { path: '/legal/cookies', changefreq: 'yearly', priority: 0.1 },
  { path: '/legal/terminos', changefreq: 'yearly', priority: 0.1 },
];

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buildSitemap(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls = entries
    .filter((e) => (seen.has(e.path) ? false : (seen.add(e.path), true)))
    .map((e) => {
      const parts = [`    <loc>${escapeXml(SITE + e.path)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${new Date(e.lastmod).toISOString().slice(0, 10)}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority != null) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

type Row = Record<string, string | null>;
export type Fetcher = (table: string, query: string) => Promise<Row[]>;

/** Public content → sitemap entries. Each source fails soft on its own. */
export async function collectEntries(fetchRows: Fetcher): Promise<SitemapEntry[]> {
  const safe = (table: string, query: string) => fetchRows(table, query).catch(() => [] as Row[]);
  const [factions, articles, guides, tournaments, featured, lists] = await Promise.all([
    safe('faction_catalog', 'select=faction_slug,updated_at'),
    safe('articles', 'select=id,updated_at&published=eq.true'),
    safe('painting_guides', 'select=id,updated_at&published=eq.true'),
    safe('tournaments', 'select=id,updated_at&published=eq.true'),
    safe('featured_lists', 'select=id,updated_at&published=eq.true'),
    safe('community_lists', 'select=id,updated_at'),
  ]);
  return [
    ...STATIC_ENTRIES,
    ...factions.map((r) => ({ path: `/catalogo-puntos/${r.faction_slug}`, lastmod: r.updated_at, changefreq: 'daily' as const, priority: 0.8 })),
    ...articles.map((r) => ({ path: `/articulos/${r.id}`, lastmod: r.updated_at, priority: 0.7 })),
    ...guides.map((r) => ({ path: `/guias/${r.id}`, lastmod: r.updated_at, priority: 0.7 })),
    ...tournaments.map((r) => ({ path: `/competitivo/torneos/${r.id}`, lastmod: r.updated_at, priority: 0.6 })),
    ...featured.map((r) => ({ path: `/competitivo/listas/${r.id}`, lastmod: r.updated_at, priority: 0.6 })),
    ...lists.map((r) => ({ path: `/comunidad/listas/${r.id}`, lastmod: r.updated_at, priority: 0.5 })),
  ];
}

export async function GET(): Promise<Response> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;

  const entries =
    url && key
      ? await collectEntries(async (table, query) => {
          const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
          });
          if (!res.ok) throw new Error(`${table}: ${res.status}`);
          return res.json();
        })
      : STATIC_ENTRIES;

  return new Response(buildSitemap(entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cached at the edge for an hour; stale copies are fine for a day.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
