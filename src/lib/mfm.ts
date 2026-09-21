const TIER_LABELS: [RegExp, string][] = [
  [/1st to 3rd/i, 'Las 3 primeras copias'],
  [/1st to 2nd/i, 'Las 2 primeras copias'],
  [/3rd\s*\+/i, 'Desde la 3.ª copia'],
  [/2nd\s*\+/i, 'Desde la 2.ª copia'],
  [/4th\s*\+/i, 'Desde la 4.ª copia'],
  [/1st unit/i, 'Solo la 1.ª copia'],
];

export function etiquetaTramo(label: string | null | undefined): string | null {
  const text = String(label || '');
  if (/your unit costs/i.test(text)) return null;
  for (const [re, es] of TIER_LABELS) {
    if (re.test(text)) return es;
  }
  return text || null;
}

export interface CatalogCost {
  models: number;
  points: number;
  desc?: string;
  addon?: boolean;
}

export interface CatalogPricingTier {
  range?: string;
  label: string;
  costs: CatalogCost[];
}

export interface CatalogUnitLike {
  pricing: CatalogPricingTier[];
  wargear?: { item: string; points: number }[];
}

function formatoCoste(cost: CatalogCost): string {
  if (cost.addon) {
    const nombre = cost.desc ? ` ${cost.desc}` : '';
    return `+${cost.points}${nombre}`;
  }
  if (cost.models <= 1) return `${cost.points} pts`;
  return `${cost.models}× ${cost.points} pts`;
}

export function tramosUnidad(unit: CatalogUnitLike) {
  return (unit.pricing || []).map((tramo) => ({
    etiqueta: etiquetaTramo(tramo.label),
    costes: (tramo.costs || []).map(formatoCoste),
  }));
}

export function normalizeFactionName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isWarhammer40k(gameName?: string | null): boolean {
  if (!gameName) return false;
  return /40[\s.,]?000|40k/i.test(gameName);
}

export function resumenUnidad(unit: CatalogUnitLike): string {
  return tramosUnidad(unit)
    .map((tramo) =>
      [tramo.etiqueta, tramo.costes.join(' · ')].filter(Boolean).join(': '),
    )
    .filter(Boolean)
    .join(' · ');
}

/** Army names (ES/EN/chapters) → official MFM faction name. */
const FACTION_CANONICAL: Record<string, string> = {
  'adepta sororitas': 'Adepta Sororitas',
  'hermanas de batalla': 'Adepta Sororitas',
  'sisters of battle': 'Adepta Sororitas',
  'adeptus custodes': 'Adeptus Custodes',
  'custodes': 'Adeptus Custodes',
  'adeptus mechanicus': 'Adeptus Mechanicus',
  'mechanicus': 'Adeptus Mechanicus',
  'aeldari': 'Aeldari',
  'eldar': 'Aeldari',
  'astry militarium': 'Astra Militarum',
  'astra militarum': 'Astra Militarum',
  'guardia imperial': 'Astra Militarum',
  'imperial guard': 'Astra Militarum',
  'black templars': 'Black Templars',
  'templarios negros': 'Black Templars',
  'blood angels': 'Blood Angels',
  'angeles sangrientos': 'Blood Angels',
  'chaos daemons': 'Chaos Daemons',
  'demonios del caos': 'Chaos Daemons',
  'chaos knights': 'Chaos Knights',
  'caballeros del caos': 'Chaos Knights',
  'chaos space marines': 'Chaos Space Marines',
  'marines espaciales del caos': 'Chaos Space Marines',
  'heresy marines': 'Chaos Space Marines',
  'chaos titan legions': 'Chaos Titan Legions',
  'dark angels': 'Dark Angels',
  'angeles oscuros': 'Dark Angels',
  'death guard': 'Death Guard',
  'guardia de la muerte': 'Death Guard',
  'deathwatch': 'Deathwatch',
  'drukhari': 'Drukhari',
  'eldar oscuros': 'Drukhari',
  'dark eldar': 'Drukhari',
  'emperors children': "Emperor's Children",
  'hijos del emperador': "Emperor's Children",
  'genestealer cults': 'Genestealer Cults',
  'cultos genestealer': 'Genestealer Cults',
  'grey knights': 'Grey Knights',
  'caballeros grises': 'Grey Knights',
  'imperial agents': 'Imperial Agents',
  'agentes imperiales': 'Imperial Agents',
  'imperial knights': 'Imperial Knights',
  'caballeros imperiales': 'Imperial Knights',
  'leagues of votann': 'Leagues of Votann',
  'votann': 'Leagues of Votann',
  'necrons': 'Necrons',
  'necrones': 'Necrons',
  'orks': 'Orks',
  'orkos': 'Orks',
  'space marines': 'Space Marines',
  'marines espaciales': 'Space Marines',
  'adeptus astartes': 'Space Marines',
  'ultramarines': 'Space Marines',
  'imperial fists': 'Space Marines',
  'iron hands': 'Space Marines',
  'raven guard': 'Space Marines',
  'salamanders': 'Space Marines',
  'white scars': 'Space Marines',
  'space wolves': 'Space Wolves',
  'lobos espaciales': 'Space Wolves',
  'thousand sons': 'Thousand Sons',
  'mil hijos': 'Thousand Sons',
  'titan legions': 'Titan Legions',
  'tyranids': 'Tyranids',
  'tiranidos': 'Tyranids',
  'tau empire': "T'au Empire",
  'tau': "T'au Empire",
  'imperio tau': "T'au Empire",
  'world eaters': 'World Eaters',
  'devoradores de mundos': 'World Eaters',
};

export function canonicalFactionName(armyName: string): string | null {
  const key = normalizeFactionName(armyName);
  if (FACTION_CANONICAL[key]) return FACTION_CANONICAL[key];
  for (const [alias, official] of Object.entries(FACTION_CANONICAL)) {
    if (alias.length >= 6 && key.includes(alias)) return official;
  }
  return null;
}

export function unitBelongsToArmy(armyName: string, factionName: string): boolean {
  const canon = canonicalFactionName(armyName);
  const faction = normalizeFactionName(factionName);
  if (canon) return normalizeFactionName(canon) === faction;
  return normalizeFactionName(armyName) === faction;
}

export function rangoTramo(
  range?: string,
  label?: string,
): { from: number; to: number } {
  const text = `${range || ''} ${label || ''}`;
  const bracket = String(range || '').match(/\[(\d+)\s*,\s*(\d+|)/);
  if (bracket) {
    const from = Number(bracket[1]);
    const to = bracket[2] ? Number(bracket[2]) : Number.POSITIVE_INFINITY;
    return { from, to };
  }
  const ords = [...text.matchAll(/(\d+)(?:st|nd|rd|th|ª|\.?ª)/gi)].map((m) =>
    Number(m[1]),
  );
  if (/1st to 2nd|2 primeras/i.test(text)) return { from: 1, to: 2 };
  if (/1st to 3rd|3 primeras/i.test(text)) return { from: 1, to: 3 };
  if (/3rd\s*\+|desde la 3/i.test(text)) return { from: 3, to: Number.POSITIVE_INFINITY };
  if (/4th\s*\+|desde la 4/i.test(text)) return { from: 4, to: Number.POSITIVE_INFINITY };
  if (/2nd\s*\+|desde la 2/i.test(text)) return { from: 2, to: Number.POSITIVE_INFINITY };
  if (/1st unit|solo la 1/i.test(text)) return { from: 1, to: 1 };
  if (ords.length >= 2 && /to/i.test(text)) {
    return { from: Number(ords[0]), to: Number(ords[1]) };
  }
  if (ords.length === 1 && /\+/.test(text)) {
    return { from: Number(ords[0]), to: Number.POSITIVE_INFINITY };
  }
  return { from: 1, to: Number.POSITIVE_INFINITY };
}

function costeBaseTramo(tramo: CatalogPricingTier): number {
  const costes = (tramo.costs || []).filter((c) => !c.addon);
  if (!costes.length) return 0;
  const uno = costes.find((c) => c.models <= 1);
  if (uno) return uno.points;
  const sorted = [...costes].sort((a, b) => a.models - b.models);
  return sorted[0]?.points ?? 0;
}

/** Points of the Nth copy (1-based), using MFM copy-cost tiers. */
export function costeCopia(pricing: CatalogPricingTier[] | null | undefined, copia: number): number {
  const tramos = pricing || [];
  if (!tramos.length || copia < 1) return 0;
  const match =
    tramos.find((t) => {
      const { from, to } = rangoTramo(t.range, t.label);
      return copia >= from && copia <= to;
    }) ?? tramos[0];
  return match ? costeBaseTramo(match) : 0;
}

export function puntosCopias(
  pricing: CatalogPricingTier[] | null | undefined,
  copias: number,
): number {
  let total = 0;
  for (let i = 1; i <= copias; i += 1) total += costeCopia(pricing, i);
  return total;
}
