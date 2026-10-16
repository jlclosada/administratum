/**
 * Ready-to-paste Reddit post (Markdown) for a points update: content first —
 * the biggest rises and drops and a per-faction count — with the link to the
 * full list at the end, which is what most subreddits accept.
 */

export interface PostChange {
  unit: string;
  /** Official (English) faction name. */
  faction: string;
  /** Spanish faction name, when there is one. */
  factionEs?: string | null;
  before: number | null;
  after: number | null;
  delta: number;
}

const SITE = "https://administratum.site";

function row(c: PostChange, faction: string): string {
  const sign = c.delta > 0 ? "+" : "";
  return `| ${c.unit} | ${faction} | ${c.before ?? "?"} | ${c.after ?? "?"} | ${sign}${c.delta} |`;
}

export function buildPointsPost(changes: PostChange[], dayIso: string, version: string | null, lang: "es" | "en"): { title: string; body: string } {
  const es = lang === "es";
  const ups = changes.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta);
  const downs = changes.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta);
  const date = new Date(`${dayIso}T12:00:00`).toLocaleDateString(es ? "es-ES" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fname = (c: PostChange) => (es && c.factionEs ? c.factionEs : c.faction);

  const byFaction = new Map<string, { up: number; down: number }>();
  for (const c of changes) {
    const f = byFaction.get(fname(c)) ?? { up: 0, down: 0 };
    if (c.delta > 0) f.up += 1;
    else f.down += 1;
    byFaction.set(fname(c), f);
  }
  const header = es ? "| Unidad | Facción | Antes | Ahora | Cambio |\n|---|---|---:|---:|---:|" : "| Unit | Faction | Before | Now | Change |\n|---|---|---:|---:|---:|";
  const factions = [...byFaction.entries()]
    .sort((a, b) => b[1].up + b[1].down - (a[1].up + a[1].down))
    .map(([f, n]) => `- **${f}**: ${[n.up ? `▲ ${n.up}` : "", n.down ? `▼ ${n.down}` : ""].filter(Boolean).join(" · ")}`);

  const title = es
    ? `Cambios de puntos de Warhammer 40K${version ? ` (MFM ${version})` : ""}: ${changes.length} unidades, ${ups.length} suben y ${downs.length} bajan`
    : `Warhammer 40K points changes${version ? ` (MFM ${version})` : ""}: ${changes.length} units, ${ups.length} up and ${downs.length} down`;

  const body = [
    es
      ? `Resumen de la actualización del Munitorum Field Manual detectada el ${date}: **${changes.length} unidades** cambian de coste (▲ ${ups.length} suben, ▼ ${downs.length} bajan).`
      : `Summary of the Munitorum Field Manual update detected on ${date}: **${changes.length} units** changed cost (▲ ${ups.length} up, ▼ ${downs.length} down).`,
    ups.length ? `**${es ? "Mayores subidas" : "Biggest increases"}**\n\n${header}\n${ups.slice(0, 10).map((c) => row(c, fname(c))).join("\n")}` : "",
    downs.length ? `**${es ? "Mayores bajadas" : "Biggest decreases"}**\n\n${header}\n${downs.slice(0, 10).map((c) => row(c, fname(c))).join("\n")}` : "",
    `**${es ? "Por facción" : "By faction"}**\n\n${factions.join("\n")}`,
    es
      ? `Lista completa con buscador por facción y unidad (gratis, sin registro): ${SITE}/cambios-puntos`
      : `Full list, searchable by faction and unit (free, no sign-up; the site is in Spanish but unit names are the official English ones): ${SITE}/cambios-puntos`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { title, body };
}

/** Subreddits the admin can open to post (the post itself is always manual). */
export const SUBREDDITS: { name: string; lang: "es" | "en"; note: string }[] = [
  { name: "WarhammerCompetitive", lang: "en", note: "Comunidad competitiva internacional; lee sus normas de autopromoción antes de publicar." },
  { name: "Warhammer40k", lang: "en", note: "La más grande; publica contenido útil, no solo el enlace." },
];
