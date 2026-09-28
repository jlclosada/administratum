// Vercel function behind the public pages (see the rewrites in vercel.json).
//
// The app is a client-rendered SPA: without this, every URL returns the same
// empty index.html, so crawlers that don't run JavaScript (Bing, WhatsApp,
// Discord, X…) see no content and Google has to render each page before it
// can index it. This serves index.html with, for the requested page:
//   - its own <title>, description, canonical, Open Graph / Twitter tags,
//   - JSON-LD (breadcrumbs, articles, events, lists…),
//   - the page's real content as plain HTML inside #root (React replaces it
//     as soon as the app boots, so users get content-first paint),
//   - a 404 status for content that doesn't exist.
//
// Data comes from Supabase with the public anon key (RLS applies), and the
// HTML is cached at the edge for 10 minutes.
//
// Self-contained on purpose: Vercel compiles each function file on its own.

export const SITE = 'https://administratum.site';
const NAME = 'Administratum';
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;
const GAME = 'Warhammer 40,000';

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

export const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** One-line meta description, cut at a word near `max`. */
export function summarize(text: string | null | undefined, max = 155): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 80 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
};

const link = (path: string, text: string) => `<a href="${esc(path)}">${esc(text)}</a>`;

// Minimal TipTap/ProseMirror JSON → HTML for articles, guides and rules.
interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: PMNode[];
}

export function richText(node: PMNode | null | undefined): string {
  if (!node) return '';
  const inner = () => (node.content ?? []).map(richText).join('');
  switch (node.type) {
    case 'doc':
      return inner();
    case 'paragraph':
      return `<p>${inner()}</p>`;
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 2), 4);
      return `<h${level}>${inner()}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${inner()}</ul>`;
    case 'orderedList':
      return `<ol>${inner()}</ol>`;
    case 'listItem':
      return `<li>${inner()}</li>`;
    case 'blockquote':
      return `<blockquote>${inner()}</blockquote>`;
    case 'codeBlock':
      return `<pre>${inner()}</pre>`;
    case 'horizontalRule':
      return '<hr>';
    case 'hardBreak':
      return '<br>';
    case 'image':
      return node.attrs?.src
        ? `<img src="${esc(node.attrs.src)}" alt="${esc(node.attrs.alt ?? '')}" loading="lazy">`
        : '';
    case 'text': {
      let out = esc(node.text);
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') out = `<strong>${out}</strong>`;
        else if (mark.type === 'italic') out = `<em>${out}</em>`;
        else if (mark.type === 'link' && typeof mark.attrs?.href === 'string' && /^https?:\/\//.test(mark.attrs.href))
          out = `<a href="${esc(mark.attrs.href)}" rel="nofollow noopener">${out}</a>`;
      }
      return out;
    }
    default:
      // Custom blocks (e.g. embedded army lists): keep any text they carry.
      return inner();
  }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Query = (table: string, query: string) => Promise<Row[]>;

function supabaseQuery(): Query {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  return async (table, query) => {
    if (!url || !key) return [];
    const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status}`);
    return res.json();
  };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface Page {
  status: number;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  breadcrumbs?: [string, string][];
  jsonLd?: Record<string, unknown>[];
  body: string;
}

const notFound = (path: string): Page => ({
  status: 404,
  title: 'Página no encontrada',
  description: 'Este contenido no existe o ya no está disponible.',
  path,
  noindex: true,
  body: `<h1>Página no encontrada</h1><p>Este contenido no existe o ya no está disponible.</p><p>${link('/', 'Volver al inicio')}</p>`,
});

/** App-only URLs (editors…): the plain SPA shell, kept out of the index. */
const appShell = (path: string): Page => ({ status: 200, title: NAME, description: '', path, noindex: true, body: '' });

// Same wording as etiquetaTramo() in src/lib/mfm.ts (the app's catalog).
const TIER_LABELS: [RegExp, string][] = [
  [/1st to 3rd/i, 'Las 3 primeras copias'],
  [/1st to 2nd/i, 'Las 2 primeras copias'],
  [/3rd\s*\+/i, 'Desde la 3.ª copia'],
  [/2nd\s*\+/i, 'Desde la 2.ª copia'],
  [/4th\s*\+/i, 'Desde la 4.ª copia'],
  [/1st unit/i, 'Solo la 1.ª copia'],
];

function tierLabel(label: unknown): string | null {
  const text = String(label ?? '');
  if (!text || /your unit costs/i.test(text)) return null;
  return TIER_LABELS.find(([re]) => re.test(text))?.[1] ?? text;
}

/** "5 miniaturas: 100 pts · 10 miniaturas: 190 pts", per tier when there are several. */
export function pricingText(pricing: Row[] | null | undefined): string {
  const tiers = (pricing ?? []).map((tier: Row) => {
    const costs = (tier.costs ?? [])
      .filter((c: Row) => !c.addon)
      .map((c: Row) => `${c.models} ${c.models === 1 ? 'miniatura' : 'miniaturas'}: ${c.points} pts`)
      .join(', ');
    const label = (pricing ?? []).length > 1 ? tierLabel(tier.label) : null;
    return label ? `${label}: ${costs}` : costs;
  });
  return tiers.filter(Boolean).join(' · ');
}

function armyListHtml(list: Row | null | undefined): string {
  if (!list?.categories?.length) return '';
  return list.categories
    .map(
      (cat: Row) =>
        `<h3>${esc(cat.name)}</h3><ul>${(cat.units ?? [])
          .map(
            (u: Row) =>
              `<li><strong>${esc(u.name)}</strong> — ${esc(u.points)} pts${
                u.bullets?.length ? `<br><small>${u.bullets.map((b: Row) => esc(b.text)).join(' · ')}</small>` : ''
              }</li>`,
          )
          .join('')}</ul>`,
    )
    .join('');
}

async function catalogIndex(q: Query): Promise<Page> {
  const factions = await q('faction_catalog', `select=faction_slug,faction_name,parent_faction&game_name=${eq(GAME)}&order=faction_name`);
  return {
    status: 200,
    title: `Catálogo de puntos de ${GAME}`,
    description: `Puntos oficiales del Munitorum Field Manual de todas las facciones de ${GAME}, actualizados cada día, con destacamentos y mejoras.`,
    path: '/catalogo-puntos',
    breadcrumbs: [['Catálogo de puntos', '/catalogo-puntos']],
    jsonLd: [
      {
        '@type': 'CollectionPage',
        name: `Catálogo de puntos de ${GAME}`,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: factions.map((f, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: f.faction_name,
            url: `${SITE}/catalogo-puntos/${f.faction_slug}`,
          })),
        },
      },
    ],
    body: `<h1>Catálogo de puntos de ${GAME}</h1>
<p>Puntos oficiales de todas las facciones, sincronizados cada día con el Munitorum Field Manual: unidades, tamaños de escuadra, destacamentos y mejoras.</p>
<ul class="grid">${factions.map((f) => `<li>${link(`/catalogo-puntos/${f.faction_slug}`, `Puntos de ${f.faction_name}`)}</li>`).join('')}</ul>`,
  };
}

async function catalogFaction(q: Query, slug: string): Promise<Page> {
  const path = `/catalogo-puntos/${slug}`;
  const [factions, units] = await Promise.all([
    q('faction_catalog', `select=faction_name,image,detachments,mfm_version,updated_at&faction_slug=${eq(slug)}&game_name=${eq(GAME)}`),
    q('unit_catalog', `select=name,category,pricing,legends,faction_name,mfm_version,updated_at&faction_slug=${eq(slug)}&game_name=${eq(GAME)}&order=name`),
  ]);
  const faction = factions[0];
  if (!faction && units.length === 0) return notFound(path);
  const name = faction?.faction_name ?? units[0].faction_name;
  const version = faction?.mfm_version ?? units[0]?.mfm_version;
  const active = units.filter((u) => !u.legends);
  const detachments: Row[] = faction?.detachments ?? [];
  const sample = active
    .slice(0, 3)
    .map((u) => `${u.name} ${u.pricing?.[0]?.costs?.[0]?.points ?? ''} pts`.trim())
    .join(', ');
  return {
    status: 200,
    title: `Puntos de ${name} · ${GAME}`,
    description: summarize(
      `Puntos oficiales actualizados de las ${active.length} unidades y ${detachments.length} destacamentos de ${name} para ${GAME}${sample ? `: ${sample}…` : '.'}`,
    ),
    path,
    image: faction?.image,
    breadcrumbs: [
      ['Catálogo de puntos', '/catalogo-puntos'],
      [name, path],
    ],
    jsonLd: [
      {
        '@type': 'ItemList',
        name: `Puntos de ${name}`,
        numberOfItems: units.length,
        itemListElement: active.slice(0, 100).map((u, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: u.name,
          description: pricingText(u.pricing),
        })),
      },
    ],
    body: `<h1>Puntos de ${esc(name)}</h1>
<p>Puntos oficiales de ${esc(name)} para ${GAME}${version ? ` (${esc(version)})` : ''}, actualizados el ${esc(fmtDate(faction?.updated_at ?? units[0]?.updated_at))}.</p>
<h2>Unidades</h2>
<table><thead><tr><th>Unidad</th><th>Puntos</th></tr></thead><tbody>${units
      .map((u) => `<tr><td>${esc(u.name)}${u.legends ? ' <small>(Legends)</small>' : ''}</td><td>${esc(pricingText(u.pricing))}</td></tr>`)
      .join('')}</tbody></table>
${
  detachments.length
    ? `<h2>Destacamentos</h2>${detachments
        .map(
          (d) =>
            `<h3>${esc(d.name)}${d.dp != null ? ` · ${esc(d.dp)} DP` : ''}</h3>${
              d.enhancements?.length
                ? `<ul>${d.enhancements.map((e: Row) => `<li>${esc(e.name)} — ${esc(e.points)} pts</li>`).join('')}</ul>`
                : ''
            }`,
        )
        .join('')}`
    : ''
}
<p>${link('/catalogo-puntos', 'Ver todas las facciones')}</p>`,
  };
}

async function article(q: Query, id: string): Promise<Page> {
  const path = `/articulos/${id}`;
  if (id === 'nuevo') return appShell(path);
  if (!uuid.test(id)) return notFound(path);
  const [a] = await q('articles', `select=id,title,excerpt,content,cover_image,tags,created_at,updated_at&id=${eq(id)}&published=eq.true`);
  if (!a) return notFound(path);
  return {
    status: 200,
    title: a.title,
    description: summarize(a.excerpt || `${a.title} — noticias de ${GAME} en ${NAME}.`),
    path,
    image: a.cover_image,
    type: 'article',
    breadcrumbs: [
      ['Noticias', '/'],
      [a.title, path],
    ],
    jsonLd: [
      {
        '@type': 'Article',
        headline: a.title,
        description: summarize(a.excerpt),
        image: a.cover_image ? [a.cover_image] : [DEFAULT_IMAGE],
        datePublished: a.created_at,
        dateModified: a.updated_at,
        author: { '@type': 'Organization', name: NAME, url: SITE },
        publisher: { '@id': `${SITE}/#organization` },
        mainEntityOfPage: `${SITE}${path}`,
        keywords: (a.tags ?? []).join(', ') || undefined,
      },
    ],
    body: `<article><h1>${esc(a.title)}</h1><p><time datetime="${esc(a.created_at)}">${esc(fmtDate(a.created_at))}</time></p>
${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ''}
${a.cover_image ? `<img src="${esc(a.cover_image)}" alt="${esc(a.title)}">` : ''}
${richText(a.content)}</article>`,
  };
}

async function guidesIndex(q: Query): Promise<Page> {
  const guides = await q('painting_guides', 'select=id,title,summary,author_name,army_name&published=eq.true&order=like_count.desc,created_at.desc&limit=60');
  return {
    status: 200,
    title: 'Guías de pintura',
    description: 'Guías y tutoriales de pintura de miniaturas publicados por la comunidad: pasos, pinturas usadas y fotos del proceso.',
    path: '/guias',
    breadcrumbs: [['Guías de pintura', '/guias']],
    body: `<h1>Guías de pintura</h1><p>Tutoriales paso a paso de la comunidad, con las pinturas usadas en cada fase.</p>
<ul>${guides
      .map(
        (g) =>
          `<li>${link(`/guias/${g.id}`, g.title)}${g.army_name ? ` · ${esc(g.army_name)}` : ''} — <small>por ${esc(g.author_name)}</small>${
            g.summary ? `<br><small>${esc(summarize(g.summary, 140))}</small>` : ''
          }</li>`,
      )
      .join('')}</ul>`,
  };
}

async function guide(q: Query, id: string): Promise<Page> {
  const path = `/guias/${id}`;
  if (id === 'nueva') return appShell(path);
  if (!uuid.test(id)) return notFound(path);
  const [g] = await q(
    'painting_guides',
    `select=id,title,summary,content,cover_image,author_name,army_name,game_name,paints,rating_sum,rating_count,created_at,updated_at&id=${eq(id)}&published=eq.true`,
  );
  if (!g) return notFound(path);
  const paints: Row[] = Array.isArray(g.paints) ? g.paints : [];
  return {
    status: 200,
    title: `${g.title} · Guía de pintura`,
    description: summarize(g.summary || `Guía de pintura de ${g.author_name}${g.army_name ? ` para ${g.army_name}` : ''}.`),
    path,
    image: g.cover_image,
    type: 'article',
    breadcrumbs: [
      ['Guías de pintura', '/guias'],
      [g.title, path],
    ],
    jsonLd: [
      {
        '@type': 'Article',
        headline: g.title,
        description: summarize(g.summary),
        image: g.cover_image ? [g.cover_image] : [DEFAULT_IMAGE],
        datePublished: g.created_at,
        dateModified: g.updated_at,
        author: { '@type': 'Person', name: g.author_name || NAME },
        publisher: { '@id': `${SITE}/#organization` },
        mainEntityOfPage: `${SITE}${path}`,
      },
    ],
    body: `<article><h1>${esc(g.title)}</h1><p><small>Por ${esc(g.author_name)}${g.army_name ? ` · ${esc(g.army_name)}` : ''} · ${esc(fmtDate(g.created_at))}</small></p>
${g.summary ? `<p class="lead">${esc(g.summary)}</p>` : ''}
${g.cover_image ? `<img src="${esc(g.cover_image)}" alt="${esc(g.title)}">` : ''}
${paints.length ? `<h2>Pinturas usadas</h2><ul>${paints.map((p) => `<li>${esc(p.name ?? p.paintName ?? '')}${p.brand ? ` (${esc(p.brand)})` : ''}</li>`).join('')}</ul>` : ''}
${richText(g.content)}</article>`,
  };
}

async function competitivo(q: Query): Promise<Page> {
  const [tournaments, featured, lists] = await Promise.all([
    q('tournaments', 'select=id,name,location,start_date,status&published=eq.true&order=start_date.desc.nullslast&limit=40'),
    q('featured_lists', 'select=id,title,faction_name,total_points&published=eq.true&order=created_at.desc&limit=30'),
    q('community_lists', 'select=id,title,faction_name,total_points&order=created_at.desc&limit=30'),
  ]);
  const listItems: Row[] = [...featured.map((l) => ({ ...l, href: `/competitivo/listas/${l.id}` })), ...lists.map((l) => ({ ...l, href: `/comunidad/listas/${l.id}` }))];
  return {
    status: 200,
    title: 'Competitivo: torneos y listas',
    description: `Torneos de ${GAME} con sus bases, fechas y plazas, y las listas de ejército que están marcando el meta.`,
    path: '/competitivo',
    breadcrumbs: [['Competitivo', '/competitivo']],
    body: `<h1>Competitivo</h1><p>Torneos de la comunidad con sus bases completas, y las listas que están marcando el meta.</p>
<h2>Torneos</h2><ul>${tournaments
      .map((t) => `<li>${link(`/competitivo/torneos/${t.id}`, t.name)}${t.start_date ? ` — ${esc(fmtDate(t.start_date))}` : ''}${t.location ? ` · ${esc(t.location)}` : ''}</li>`)
      .join('')}</ul>
<h2>Listas</h2><ul>${listItems
      .map((l) => `<li>${link(l.href, l.title)} — ${esc(l.faction_name ?? '')}${l.total_points ? ` · ${esc(l.total_points)} pts` : ''}</li>`)
      .join('')}</ul>`,
  };
}

async function tournament(q: Query, id: string): Promise<Page> {
  const path = `/competitivo/torneos/${id}`;
  if (!uuid.test(id)) return notFound(path);
  const [t] = await q(
    'tournaments',
    `select=id,name,description,rules,cover_image,location,start_date,end_date,status,points_limit,max_players,entry_fee,attendee_count,external_link,game_name&id=${eq(id)}&published=eq.true`,
  );
  if (!t) return notFound(path);
  const facts = [
    t.start_date && `Fecha: ${fmtDate(t.start_date)}${t.end_date && t.end_date !== t.start_date ? ` – ${fmtDate(t.end_date)}` : ''}`,
    t.location && `Lugar: ${t.location}`,
    t.points_limit && `Puntos: ${t.points_limit}`,
    t.max_players && `Plazas: ${t.attendee_count ?? 0} de ${t.max_players}`,
    t.entry_fee && `Inscripción: ${t.entry_fee}`,
  ].filter(Boolean) as string[];
  return {
    status: 200,
    title: t.name,
    description: summarize(t.description || `${t.name}: torneo de ${t.game_name || GAME}${t.location ? ` en ${t.location}` : ''}${t.start_date ? ` el ${fmtDate(t.start_date)}` : ''}.`),
    path,
    image: t.cover_image,
    breadcrumbs: [
      ['Competitivo', '/competitivo'],
      [t.name, path],
    ],
    jsonLd: t.start_date
      ? [
          {
            '@type': 'Event',
            name: t.name,
            description: summarize(t.description, 300),
            startDate: t.start_date,
            endDate: t.end_date || t.start_date,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            location: t.location ? { '@type': 'Place', name: t.location, address: t.location } : undefined,
            image: t.cover_image ? [t.cover_image] : [DEFAULT_IMAGE],
            url: `${SITE}${path}`,
            organizer: t.external_link ? { '@type': 'Organization', name: t.name, url: t.external_link } : undefined,
          },
        ]
      : [],
    body: `<article><h1>${esc(t.name)}</h1>
${facts.length ? `<ul>${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
${t.cover_image ? `<img src="${esc(t.cover_image)}" alt="${esc(t.name)}">` : ''}
${t.description ? `<p>${esc(t.description)}</p>` : ''}
${t.rules ? `<h2>Bases del torneo</h2>${richText(t.rules)}` : ''}
<p>${link('/competitivo', 'Más torneos')}</p></article>`,
  };
}

async function armyList(q: Query, id: string, kind: 'featured' | 'community'): Promise<Page> {
  const path = kind === 'featured' ? `/competitivo/listas/${id}` : `/comunidad/listas/${id}`;
  if (!uuid.test(id)) return notFound(path);
  const [l] =
    kind === 'featured'
      ? await q('featured_lists', `select=id,title,faction_name,total_points,author_name,description,cover_image,list_data,result,tournament_name,created_at,updated_at&id=${eq(id)}&published=eq.true`)
      : await q('community_lists', `select=id,title,faction_name,total_points,author_name,description,detachment_name,list_data,result,tournament_name,created_at,updated_at&id=${eq(id)}`);
  if (!l) return notFound(path);
  const detachment = l.detachment_name ?? l.list_data?.detachmentName;
  const parent: [string, string] = kind === 'featured' ? ['Competitivo', '/competitivo'] : ['Comunidad', '/comunidad'];
  return {
    status: 200,
    title: `${l.title} · Lista de ${l.faction_name ?? GAME}`,
    description: summarize(
      l.description || `Lista de ${l.faction_name}${detachment ? ` (${detachment})` : ''} a ${l.total_points} puntos, por ${l.author_name}.`,
    ),
    path,
    image: l.cover_image,
    type: 'article',
    breadcrumbs: [parent, [l.title, path]],
    jsonLd: [
      {
        '@type': 'Article',
        headline: `${l.title} — ${l.faction_name ?? ''} ${l.total_points ?? ''} pts`.trim(),
        description: summarize(l.description),
        datePublished: l.created_at,
        dateModified: l.updated_at,
        author: { '@type': 'Person', name: l.author_name || NAME },
        publisher: { '@id': `${SITE}/#organization` },
        image: l.cover_image ? [l.cover_image] : [DEFAULT_IMAGE],
        mainEntityOfPage: `${SITE}${path}`,
      },
    ],
    body: `<article><h1>${esc(l.title)}</h1>
<p><strong>${esc(l.faction_name ?? '')}</strong>${detachment ? ` · ${esc(detachment)}` : ''}${l.total_points ? ` · ${esc(l.total_points)} pts` : ''} · por ${esc(l.author_name)}</p>
${l.tournament_name ? `<p>Torneo: ${esc(l.tournament_name)}${l.result ? ` · Resultado: ${esc(l.result)}` : ''}</p>` : ''}
<h2>Lista</h2>${armyListHtml(l.list_data)}
${l.description ? `<h2>Cómo se juega</h2><p>${esc(l.description)}</p>` : ''}</article>`,
  };
}

async function comunidad(q: Query): Promise<Page> {
  const [photos, lists] = await Promise.all([
    q('shared_photos', 'select=id,title,caption,author_name,army_name,image&order=created_at.desc&limit=40'),
    q('community_lists', 'select=id,title,faction_name,total_points,author_name&order=created_at.desc&limit=40'),
  ]);
  return {
    status: 200,
    title: 'Comunidad: fotos y listas',
    description: 'Ejércitos pintados, proyectos en curso y listas de ejército compartidas por la comunidad de Administratum.',
    path: '/comunidad',
    image: photos[0]?.image,
    breadcrumbs: [['Comunidad', '/comunidad']],
    body: `<h1>Comunidad</h1><p>Colecciones, proyectos y listas compartidos por otros coleccionistas.</p>
<h2>Fotos recientes</h2><ul class="grid">${photos
      .map(
        (p) =>
          `<li><a href="/comunidad?foto=${esc(p.id)}"><img src="${esc(p.image)}" alt="${esc(p.title || p.caption || 'Miniaturas pintadas')}" loading="lazy" width="240"><br>${esc(p.title || p.army_name || 'Foto')}</a> <small>por ${esc(p.author_name)}</small></li>`,
      )
      .join('')}</ul>
<h2>Listas de la comunidad</h2><ul>${lists
      .map((l) => `<li>${link(`/comunidad/listas/${l.id}`, l.title)} — ${esc(l.faction_name)} · ${esc(l.total_points)} pts <small>por ${esc(l.author_name)}</small></li>`)
      .join('')}</ul>`,
  };
}

async function profile(q: Query, id: string): Promise<Page> {
  const path = `/perfil/${id}`;
  if (!uuid.test(id)) return notFound(path);
  const [[p], guides, lists] = await Promise.all([
    q('profiles', `select=id,display_name,bio,avatar_url,location,favorite_faction&id=${eq(id)}`),
    q('painting_guides', `select=id,title&user_id=${eq(id)}&published=eq.true&order=created_at.desc&limit=30`),
    q('community_lists', `select=id,title,faction_name,total_points&user_id=${eq(id)}&order=created_at.desc&limit=30`),
  ]);
  if (!p) return notFound(path);
  const name = p.display_name || 'Usuario';
  // Profiles with nothing public yet are thin pages: reachable, not indexed.
  const thin = !p.bio && guides.length === 0 && lists.length === 0;
  return {
    status: 200,
    title: name,
    description: summarize(p.bio || `Colección, fotos, guías y listas de ${name} en ${NAME}.`),
    path,
    image: p.avatar_url,
    type: 'profile',
    noindex: thin,
    breadcrumbs: [
      ['Comunidad', '/comunidad'],
      [name, path],
    ],
    jsonLd: [
      {
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name,
          description: p.bio || undefined,
          image: p.avatar_url || undefined,
          homeLocation: p.location || undefined,
        },
      },
    ],
    body: `<h1>${esc(name)}</h1>
<p>${[p.location, p.favorite_faction].filter(Boolean).map(esc).join(' · ')}</p>
${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
${guides.length ? `<h2>Guías</h2><ul>${guides.map((g) => `<li>${link(`/guias/${g.id}`, g.title)}</li>`).join('')}</ul>` : ''}
${lists.length ? `<h2>Listas</h2><ul>${lists.map((l) => `<li>${link(`/comunidad/listas/${l.id}`, l.title)} — ${esc(l.faction_name)} · ${esc(l.total_points)} pts</li>`).join('')}</ul>` : ''}`,
  };
}

async function descargas(q: Query): Promise<Page> {
  const rows = await q('downloads_catalog', `select=title,category,file_url,file_size,source_updated_at&game_name=${eq(GAME)}&order=category,title`);
  const byCategory = new Map<string, Row[]>();
  for (const r of rows) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);
  return {
    status: 200,
    title: `Descargas oficiales de ${GAME}`,
    description: `Reglas básicas, faction packs, dataslates y documentos oficiales de ${GAME}, siempre en su última versión.`,
    path: '/descargas',
    breadcrumbs: [['Descargas', '/descargas']],
    body: `<h1>Descargas oficiales de ${GAME}</h1><p>Documentos oficiales en PDF, actualizados automáticamente cuando se publica una nueva versión.</p>
${[...byCategory]
  .map(
    ([cat, items]) =>
      `<h2>${esc(cat)}</h2><ul>${items
        .map(
          (d) =>
            `<li><a href="${esc(d.file_url)}" rel="nofollow noopener">${esc(d.title)}</a>${d.file_size ? ` <small>(${esc(d.file_size)})</small>` : ''}${
              d.source_updated_at ? ` <small>· ${esc(fmtDate(d.source_updated_at))}</small>` : ''
            }</li>`,
        )
        .join('')}</ul>`,
  )
  .join('')}`,
  };
}

/** Maps a public URL path to its page, or null to serve the plain shell. */
export async function renderPath(path: string, q: Query): Promise<Page | null> {
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  if (a === 'catalogo-puntos' && parts.length === 1) return catalogIndex(q);
  if (a === 'catalogo-puntos' && parts.length === 2) return catalogFaction(q, b);
  if (a === 'articulos' && parts.length === 2) return article(q, b);
  if (a === 'guias' && parts.length === 1) return guidesIndex(q);
  if (a === 'guias' && parts.length === 2) return guide(q, b);
  if (a === 'competitivo' && parts.length === 1) return competitivo(q);
  if (a === 'competitivo' && b === 'torneos' && parts.length === 3) return tournament(q, c);
  if (a === 'competitivo' && b === 'listas' && parts.length === 3) return armyList(q, c, 'featured');
  if (a === 'comunidad' && parts.length === 1) return comunidad(q);
  if (a === 'comunidad' && b === 'listas' && parts.length === 3) return armyList(q, c, 'community');
  if (a === 'perfil' && parts.length === 2) return profile(q, b);
  if (a === 'descargas' && parts.length === 1) return descargas(q);
  return null;
}

// ---------------------------------------------------------------------------
// Injection into index.html
// ---------------------------------------------------------------------------

const NAV: [string, string][] = [
  ['Catálogo de puntos', '/catalogo-puntos'],
  ['Competitivo', '/competitivo'],
  ['Comunidad', '/comunidad'],
  ['Guías de pintura', '/guias'],
  ['Descargas', '/descargas'],
];

// Styles for the pre-rendered markup, visible only until React replaces it.
const PRERENDER_CSS = `html{background:#09090b}[data-prerender]{max-width:880px;margin:0 auto;padding:24px 16px 64px;font:16px/1.65 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#d4d4d8}
[data-prerender] a{color:#d8c08a}[data-prerender] h1,[data-prerender] h2,[data-prerender] h3{color:#fafafa;line-height:1.25}
[data-prerender] img{max-width:100%;height:auto;border-radius:12px}[data-prerender] table{width:100%;border-collapse:collapse;font-size:14px}
[data-prerender] td,[data-prerender] th{border-bottom:1px solid #26262b;padding:6px 8px;text-align:left;vertical-align:top}
[data-prerender] nav ul,[data-prerender] .grid{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px 18px}
[data-prerender] .lead{font-size:18px;color:#e4e4e7}[data-prerender] small{color:#8f8f98}`;

function breadcrumbHtml(crumbs: [string, string][]): string {
  const all: [string, string][] = [['Inicio', '/'], ...crumbs];
  return `<nav aria-label="Migas de pan"><ol style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:6px;font-size:13px">${all
    .map(([label, href], i) => `<li>${i < all.length - 1 ? `${link(href, label)} ›` : esc(label)}</li>`)
    .join('')}</ol></nav>`;
}

export function inject(template: string, page: Page): string {
  const fullTitle = page.title === NAME ? NAME : `${page.title} · ${NAME}`;
  const url = `${SITE}${page.path}`;
  const image = page.image && /^https?:\/\//.test(page.image) ? page.image : DEFAULT_IMAGE;
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebSite', '@id': `${SITE}/#website`, name: NAME, url: `${SITE}/`, inLanguage: 'es' },
    { '@type': 'Organization', '@id': `${SITE}/#organization`, name: NAME, url: `${SITE}/`, logo: `${SITE}/icon-512.png` },
    ...(page.breadcrumbs?.length
      ? [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [['Inicio', '/'], ...page.breadcrumbs].map(([name, path], i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name,
              item: `${SITE}${path}`,
            })),
          },
        ]
      : []),
    ...(page.jsonLd ?? []),
  ];
  const head = [
    `<title>${esc(fullTitle)}</title>`,
    page.description && `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="robots" content="${page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="${page.type ?? 'website'}" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:locale" content="es_ES" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(fullTitle)}" />`,
    page.description && `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(fullTitle)}" />`,
    page.description && `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`,
    `<style>${PRERENDER_CSS}</style>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  const stripped = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[\s\S]*?\/>/g, '')
    .replace(/<link rel="canonical"[^>]*\/>/g, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace(/\n\s*<!--[^>]*-->/g, '');

  const body = page.body
    ? `<div data-prerender>
<nav aria-label="Secciones"><a href="/"><img src="/images/logo.png" alt="${NAME}" width="180" height="40" style="height:40px;width:auto"></a><ul>${NAV.map(([label, href]) => `<li>${link(href, label)}</li>`).join('')}</ul></nav>
${page.breadcrumbs?.length ? breadcrumbHtml(page.breadcrumbs) : ''}
<main>${page.body}</main>
<footer><p><small>${NAME} · Colección, pintura, puntos y listas de ${GAME}. Proyecto independiente, sin afiliación con Games Workshop. ${link('/legal/privacidad', 'Privacidad')} · ${link('/legal/terminos', 'Términos')}</small></p></footer>
</div>`
    : '';

  return stripped.replace('</head>', `    ${head}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

let templateCache: { html: string; at: number } | null = null;

async function loadTemplate(origin: string): Promise<string> {
  // index.html only changes on deploy; a warm instance keeps it for a minute.
  if (templateCache && Date.now() - templateCache.at < 60_000) return templateCache.html;
  const res = await fetch(`${origin}/index.html`, { headers: { 'x-prerender-template': '1' } });
  if (!res.ok) throw new Error(`template: ${res.status}`);
  const html = await res.text();
  templateCache = { html, at: Date.now() };
  return html;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = `/${(url.searchParams.get('path') ?? '').replace(/^\/+/, '')}`;
  const template = await loadTemplate(url.origin);

  let page: Page | null = null;
  try {
    page = await renderPath(path, supabaseQuery());
  } catch (err) {
    // Database hiccup: serve the plain app rather than an error page.
    console.error('prerender failed', path, err);
  }

  return new Response(page ? inject(template, page) : template, {
    status: page?.status ?? 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Browsers always revalidate the HTML (new deploys); the edge keeps it
      // 10 minutes and may serve a stale copy for a day while refreshing.
      'Cache-Control': 'no-cache',
      'Vercel-CDN-Cache-Control': 'max-age=600, stale-while-revalidate=86400',
    },
  });
}
