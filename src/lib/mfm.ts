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
