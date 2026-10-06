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
  { path: '/partidas', changefreq: 'daily', priority: 0.8 },
  { path: '/cambios-puntos', changefreq: 'daily', priority: 0.8 },
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

/** Same as unitSlug() in src/lib/seoCopy.ts and api/render.ts (a test checks). */
export function unitSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type Row = Record<string, string | null>;
export type Fetcher = (table: string, query: string) => Promise<Row[]>;

/** Public content → sitemap entries. Each source fails soft on its own. */
export async function collectEntries(fetchRows: Fetcher): Promise<SitemapEntry[]> {
  const safe = (table: string, query: string) => fetchRows(table, query).catch(() => [] as Row[]);
  // ~1,400 units: more than one page of the API (1,000 rows max).
  const allUnits = async () => {
    const rows: Row[] = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
      const page = await safe('unit_catalog', `select=faction_slug,name,updated_at&order=faction_slug,name&offset=${offset}&limit=1000`);
      rows.push(...page);
      if (page.length < 1000) break;
    }
    return rows;
  };
  const [factions, articles, guides, tournaments, featured, lists, units] = await Promise.all([
    safe('faction_catalog', 'select=faction_slug,updated_at'),
    safe('articles', 'select=id,updated_at&published=eq.true'),
    safe('painting_guides', `select=id,updated_at&published=eq.true&or=${encodeURIComponent('(game_name.is.null,game_name.ilike.*40*)')}`),
    safe('tournaments', 'select=id,updated_at&published=eq.true'),
    safe('featured_lists', 'select=id,updated_at&published=eq.true'),
    safe('community_lists', 'select=id,updated_at'),
    allUnits(),
  ]);
  const latest = (rows: Row[]) => rows.reduce<string | null>((max, r) => (r.updated_at && (!max || r.updated_at > max) ? r.updated_at : max), null);
  return [
    // The home page lists the latest points changes, tournaments and lists.
    ...STATIC_ENTRIES.map((e) => (e.path === '/' ? { ...e, lastmod: latest([...factions, ...tournaments, ...lists]) } : e)),
    ...factions.map((r) => ({ path: `/catalogo-puntos/${r.faction_slug}`, lastmod: r.updated_at, changefreq: 'daily' as const, priority: 0.8 })),
    ...articles.map((r) => ({ path: `/articulos/${r.id}`, lastmod: r.updated_at, priority: 0.7 })),
    ...guides.map((r) => ({ path: `/guias/${r.id}`, lastmod: r.updated_at, priority: 0.7 })),
    ...tournaments.map((r) => ({ path: `/competitivo/torneos/${r.id}`, lastmod: r.updated_at, priority: 0.6 })),
    ...featured.map((r) => ({ path: `/competitivo/listas/${r.id}`, lastmod: r.updated_at, priority: 0.6 })),
    ...lists.map((r) => ({ path: `/comunidad/listas/${r.id}`, lastmod: r.updated_at, priority: 0.5 })),
    ...units
      .filter((r) => r.faction_slug && r.name)
      .map((r) => ({ path: `/catalogo-puntos/${r.faction_slug}/${unitSlug(r.name!)}`, lastmod: r.updated_at, priority: 0.6 })),
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
