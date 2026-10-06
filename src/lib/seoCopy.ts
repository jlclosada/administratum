/**
 * Titles and descriptions of the public pages, worded for what people search
 * in Spanish ("puntos warhammer 40k", "listas 40k", "torneos warhammer
 * españa"…). The server-rendered HTML (api/render.ts) must say exactly the
 * same — it keeps its own copy (Vercel builds each function on its own) and
 * a test checks both agree.
 */
import { FACTION_ES, factionDisplayName } from "./factionNames";

export interface SeoCopy {
  title: string;
  description: string;
}

export const SEO_CATALOG: SeoCopy = {
  title: "Puntos de Warhammer 40K actualizados: todas las facciones",
  description:
    "Puntos oficiales de Warhammer 40.000 actualizados cada día desde el Munitorum Field Manual para todas las facciones: Marines Espaciales, Necrones, Mil Hijos, Orkos, Tiránidos y más.",
};

export function seoFaction(slug: string, englishName: string, units: number, detachments: number): SeoCopy {
  const name = factionDisplayName(slug, englishName);
  return {
    title: `Puntos de ${name} · Warhammer 40K`,
    description: `Puntos actualizados de ${name} para Warhammer 40K: ${units} unidades y ${detachments} destacamentos con sus mejoras, al día con el Munitorum Field Manual.`,
  };
}

export const SEO_POINTS_CHANGES: SeoCopy = {
  title: "Cambios de puntos de Warhammer 40K: subidas y bajadas",
  description:
    "Todos los cambios de puntos del Munitorum Field Manual de Warhammer 40K en cuanto se publican: qué unidades suben y cuáles bajan, facción por facción, con el coste anterior y el nuevo.",
};

export const SEO_COMPETITIVO: SeoCopy = {
  title: "Torneos de Warhammer 40K en España y listas competitivas",
  description:
    "Calendario de torneos de Warhammer 40K en España con sus bases, fechas y plazas, y las listas de ejército que están marcando el meta.",
};

export const SEO_COMUNIDAD: SeoCopy = {
  title: "Comunidad de Warhammer 40K: ejércitos pintados y listas",
  description:
    "Fotos de ejércitos pintados, proyectos en curso y listas de ejército de Warhammer 40K compartidas por la comunidad hispanohablante.",
};

export const SEO_GUIAS: SeoCopy = {
  title: "Guías de pintura de miniaturas de Warhammer",
  description:
    "Tutoriales paso a paso para pintar miniaturas de Warhammer 40K: esquemas de color, pinturas usadas en cada fase y fotos del proceso.",
};

export const SEO_DESCARGAS: SeoCopy = {
  title: "Descargas oficiales de Warhammer 40K: reglas, faction packs y dataslates",
  description:
    "Reglas básicas, faction packs, dataslates y documentos oficiales de Warhammer 40K en PDF, siempre en su última versión.",
};

export function seoListTitle(title: string, faction: string | null, points: number | null): string {
  return `${title}: lista de ${faction ?? "Warhammer 40K"}${points ? ` a ${points} pts` : ""} · Warhammer 40K`;
}

export function seoTournamentTitle(name: string, location: string | null): string {
  return `${name}: torneo de Warhammer 40K${location ? ` en ${location}` : ""}`;
}

/** URL segment for a unit: "Sorcerer In Terminator Armour" → "sorcerer-in-terminator-armour". */
export function unitSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Cheapest base option of a unit ("5 miniaturas, 100 pts"), for titles and summaries. */
export function baseCost(pricing: { costs?: { models: number; points: number; addon?: boolean }[] }[] | null | undefined): { models: number; points: number } | null {
  const c = (pricing ?? []).flatMap((t) => t.costs ?? []).find((x) => !x.addon);
  return c ? { models: c.models, points: c.points } : null;
}

export function seoUnit(unitName: string, factionSlug: string, factionEnglish: string, cost: { models: number; points: number } | null): SeoCopy {
  const faction = factionDisplayName(factionSlug, factionEnglish);
  const short = FACTION_ES[factionSlug] ?? factionEnglish;
  const price = cost ? `${cost.points} pts (${cost.models} ${cost.models === 1 ? "miniatura" : "miniaturas"})` : null;
  return {
    title: `Puntos de ${unitName} (${short}) · Warhammer 40K`,
    description: `${unitName} de ${faction} en Warhammer 40K${price ? `: ${price}` : ""}. Coste oficial actualizado del Munitorum Field Manual, opciones de equipo, a quién puede liderar e historial de cambios de puntos.`,
  };
}
