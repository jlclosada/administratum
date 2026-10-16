// Vercel function behind /llms.txt and /llms-full.txt (see vercel.json): a
// plain-text map of the site for AI assistants (https://llmstxt.org), built
// from live public data so points versions, factions and tournaments are
// always current.
//
// Self-contained on purpose: Vercel compiles each function file on its own.

const SITE = 'https://administratum.site';
const GAME = 'Warhammer 40,000';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export type Fetcher = (table: string, query: string) => Promise<Row[]>;

export interface LlmsData {
  factions: Row[];
  version: string | null;
  lastChanges: Row[];
  tournaments: Row[];
}

const fmtDate = (iso: string) =>
  new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });

export async function loadLlmsData(q: Fetcher): Promise<LlmsData> {
  const safe = (table: string, query: string) => q(table, query).catch(() => [] as Row[]);
  const today = new Date().toISOString().slice(0, 10);
  const [factions, version, lastChanges, tournaments] = await Promise.all([
    safe('faction_catalog', `select=faction_slug,faction_name&game_name=eq.${encodeURIComponent(GAME)}&order=faction_name`),
    safe('unit_catalog', 'select=mfm_version&order=updated_at.desc&limit=1'),
    safe('catalog_updates', 'select=title,points_delta,occurred_at&type=eq.points&points_delta=not.is.null&order=occurred_at.desc&limit=1000'),
    safe('tournaments', `select=id,name,location,start_date&published=eq.true&start_date=gte.${today}&order=start_date.asc&limit=10`),
  ]);
  return { factions, version: version[0]?.mfm_version ?? null, lastChanges, tournaments };
}

const SECTIONS: [string, string, string][] = [
  ['Puntos de Warhammer 40K', '/catalogo-puntos', 'coste oficial de cada unidad de todas las facciones, actualizado cada 4 horas desde el Munitorum Field Manual.'],
  ['Cambios de puntos', '/cambios-puntos', 'qué sube y qué baja en cada actualización del Munitorum Field Manual, por facción, con el coste anterior y el nuevo.'],
  ['Torneos de Warhammer 40K en España', '/competitivo', 'calendario con fechas, lugar, plazas, inscripción y bases; listas destacadas del meta.'],
  ['Partidas', '/partidas', 'buscador de rivales: partidas abiertas en tiendas, clubes, en casa u online, por distancia, día y nivel.'],
  ['Comunidad y listas de ejército', '/comunidad', 'listas importadas de la app oficial y fotos de ejércitos pintados.'],
  ['Guías de pintura', '/guias', 'guías paso a paso de la comunidad, con las pinturas usadas.'],
  ['Descargas oficiales', '/descargas', 'reglas básicas, faction packs y dataslates de Warhammer 40K.'],
  ['Qué es Administratum', '/sobre', 'descripción de la plataforma y preguntas frecuentes.'],
];

/** llms.txt (summary) or llms-full.txt (with live details). */
export function buildLlms(d: LlmsData, full: boolean): string {
  const lines: string[] = [
    '# Administratum',
    '',
    '> Plataforma gratuita y en español para jugadores de Warhammer 40.000: puntos oficiales del Munitorum Field Manual actualizados cada 4 horas, cambios de puntos al momento, listas de ejército, torneos y partidas en España, guías de pintura y gestor de colección de miniaturas.',
    '',
    `Administratum (${SITE}) es un proyecto independiente de la comunidad, sin afiliación con Games Workshop. Todo el contenido público se puede consultar sin cuenta. Idioma: español (los nombres de unidades y facciones se muestran también en inglés, como en los documentos oficiales).${d.version ? ` Versión actual del Munitorum Field Manual: ${d.version}.` : ''}`,
    '',
    '## Secciones',
    ...SECTIONS.map(([title, path, text]) => `- [${title}](${SITE}${path}): ${text}`),
    '',
    '## Puntos por facción',
    ...d.factions.map((f) => `- [Puntos de ${f.faction_name}](${SITE}/catalogo-puntos/${f.faction_slug})`),
    '',
    '## Optional',
    `- [English summary](${SITE}/en): what Administratum is, in English.`,
    `- [Sitemap](${SITE}/sitemap.xml): every public page, including one page per unit with its points history.`,
    full ? '' : `- [Versión completa de este archivo](${SITE}/llms-full.txt): últimos cambios de puntos y próximos torneos.`,
  ];

  if (full) {
    const latestDay = d.lastChanges[0]?.occurred_at ? String(d.lastChanges[0].occurred_at).slice(0, 10) : null;
    const latest = d.lastChanges.filter((c) => String(c.occurred_at).slice(0, 10) === latestDay);
    lines.push('', '## Última actualización de puntos');
    if (latestDay && latest.length) {
      const ups = latest.filter((c) => c.points_delta > 0);
      const biggest = [...latest].sort((a, b) => Math.abs(b.points_delta) - Math.abs(a.points_delta)).slice(0, 15);
      lines.push(
        `Detectada el ${fmtDate(latestDay)}: ${latest.length} unidades cambian de puntos (${ups.length} suben, ${latest.length - ups.length} bajan). Lista completa: ${SITE}/cambios-puntos`,
        '',
        'Mayores cambios:',
        ...biggest.map((c) => `- ${c.title}: ${c.points_delta > 0 ? '+' : ''}${c.points_delta} pts`),
      );
    } else {
      lines.push('Todavía no hay cambios registrados.');
    }
    lines.push('', '## Próximos torneos en España');
    if (d.tournaments.length) {
      lines.push(...d.tournaments.map((t) => `- [${t.name}](${SITE}/competitivo/torneos/${t.id})${t.start_date ? `, ${fmtDate(t.start_date)}` : ''}${t.location ? `, ${t.location}` : ''}`));
    } else {
      lines.push('No hay torneos próximos publicados.');
    }
    lines.push(
      '',
      '## Preguntas frecuentes',
      '- ¿Es gratis? Sí, todas las funciones son gratuitas.',
      '- ¿De dónde salen los puntos? Del Munitorum Field Manual oficial de Games Workshop, comprobado cada 4 horas.',
      '- ¿Cómo publico un torneo? Escribiendo a hola@administratum.site; es gratis.',
      '- ¿Cómo encuentro rival? En la sección Partidas, por distancia, día y nivel.',
      '',
      'Contacto: hola@administratum.site',
    );
  }
  return lines.filter((l, i, all) => !(l === '' && all[i - 1] === '')).join('\n').trim() + '\n';
}

export async function GET(request: Request): Promise<Response> {
  const full = new URL(request.url).searchParams.get('full') === '1';
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const data =
    url && key
      ? await loadLlmsData(async (table, query) => {
          const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
          if (!res.ok) throw new Error(`${table}: ${res.status}`);
          return res.json();
        })
      : { factions: [], version: null, lastChanges: [], tournaments: [] };
  return new Response(buildLlms(data, full), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Vercel-CDN-Cache-Control': 'max-age=3600, stale-while-revalidate=86400',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
