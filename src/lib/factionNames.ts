/**
 * Spanish names of the Warhammer 40,000 factions (as Games Workshop uses them
 * in Spain), keyed by catalog slug. The points catalog comes from the English
 * Munitorum Field Manual; showing both names lets people who search either
 * one ("puntos Mil Hijos" / "puntos Thousand Sons") land on the same page.
 *
 * Keep in sync with FACTION_ES in api/render.ts (a test checks it).
 */
export const FACTION_ES: Record<string, string> = {
  'black-templars': 'Templarios Negros',
  'blood-angels': 'Ángeles Sangrientos',
  'chaos-daemons': 'Demonios del Caos',
  'chaos-knights': 'Caballeros del Caos',
  'chaos-space-marines': 'Marines Espaciales del Caos',
  'chaos-titan-legions': 'Legiones de Titanes del Caos',
  'dark-angels': 'Ángeles Oscuros',
  'death-guard': 'Guardia de la Muerte',
  'emperors-children': 'Hijos del Emperador',
  'genestealer-cults': 'Cultos Genestealer',
  'grey-knights': 'Caballeros Grises',
  'imperial-agents': 'Agentes Imperiales',
  'imperial-knights': 'Caballeros Imperiales',
  'leagues-of-votann': 'Ligas de Votann',
  necrons: 'Necrones',
  orks: 'Orkos',
  'space-marines': 'Marines Espaciales',
  'space-wolves': 'Lobos Espaciales',
  'tau-empire': "Imperio T'au",
  'thousand-sons': 'Mil Hijos',
  'titan-legions': 'Legiones de Titanes',
  tyranids: 'Tiránidos',
  'world-eaters': 'Devoradores de Mundos',
};

/** "Mil Hijos (Thousand Sons)", or just the name when both match. */
export function factionDisplayName(slug: string, englishName: string): string {
  const es = FACTION_ES[slug];
  return es && es !== englishName ? `${es} (${englishName})` : englishName;
}

/** Spanish name when it differs from the English one, else null. */
export function factionSpanishName(slug: string, englishName: string): string | null {
  const es = FACTION_ES[slug];
  return es && es !== englishName ? es : null;
}
