import { describe, expect, it } from 'vitest';
import {
  canonicalFactionName,
  costeCopia,
  costeUnidad,
  etiquetaTramo,
  normalizeFactionName,
  opcionesComposicion,
  puntosEjercito,
  puntosListaPorFilas,
  puntosListaTotal,
  rangoTramo,
  tamanoMinimoUnidad,
  tamanoUnidadLista,
  tamanosUnidad,
  unitBelongsToArmy,
  type CatalogPricingTier,
} from './mfm';

// A squad sellable as 5 or 10 models, with a cheaper rate for the first two
// copies and a costlier "3rd+" tier — mirrors a real Munitorum Field Manual entry.
const TERMINATOR_PRICING: CatalogPricingTier[] = [
  {
    range: '[1,2]',
    label: '1st to 2nd',
    costs: [
      { models: 5, points: 150 },
      { models: 10, points: 300 },
    ],
  },
  {
    range: '[3,]',
    label: '3rd+',
    costs: [
      { models: 5, points: 175 },
      { models: 10, points: 350 },
    ],
  },
];

describe('normalizeFactionName', () => {
  it('lowercases, strips apostrophes and collapses punctuation to spaces', () => {
    expect(normalizeFactionName("T'au Empire")).toBe('tau empire');
    expect(normalizeFactionName('Adepta Sororitas')).toBe('adepta sororitas');
    expect(normalizeFactionName('  Space-Marines!! ')).toBe('space marines');
  });
});

describe('etiquetaTramo', () => {
  it('translates known MFM tier labels to Spanish', () => {
    expect(etiquetaTramo('1st to 2nd')).toBe('Las 2 primeras copias');
    expect(etiquetaTramo('3rd+')).toBe('Desde la 3.ª copia');
  });

  it('drops the generic "your unit costs" label', () => {
    expect(etiquetaTramo('Your unit costs...')).toBeNull();
  });

  it('falls back to the raw text for unrecognized labels', () => {
    expect(etiquetaTramo('Custom label')).toBe('Custom label');
    expect(etiquetaTramo(null)).toBeNull();
  });
});

describe('canonicalFactionName / unitBelongsToArmy', () => {
  it('maps known aliases (ES/EN) to the official MFM faction name', () => {
    expect(canonicalFactionName('Hermanas de Batalla')).toBe('Adepta Sororitas');
    expect(canonicalFactionName('Sisters of Battle')).toBe('Adepta Sororitas');
    expect(canonicalFactionName('Ultramarines')).toBe('Space Marines');
  });

  it('returns null for names with no known alias', () => {
    expect(canonicalFactionName('Not A Real Army')).toBeNull();
  });

  it('matches an army to its faction through the canonical alias', () => {
    expect(unitBelongsToArmy('Imperial Fists', 'Space Marines')).toBe(true);
    expect(unitBelongsToArmy('Imperial Fists', 'Orks')).toBe(false);
  });
});

describe('rangoTramo', () => {
  it('parses explicit bracket ranges', () => {
    expect(rangoTramo('[1,2]')).toEqual({ from: 1, to: 2 });
    expect(rangoTramo('[3,]')).toEqual({ from: 3, to: Infinity });
  });

  it('falls back to label text when there is no bracket range', () => {
    expect(rangoTramo(undefined, '1st to 2nd')).toEqual({ from: 1, to: 2 });
    expect(rangoTramo(undefined, '3rd+')).toEqual({ from: 3, to: Infinity });
    expect(rangoTramo(undefined, '1st unit')).toEqual({ from: 1, to: 1 });
  });

  it('defaults to an unbounded range when nothing matches', () => {
    expect(rangoTramo(undefined, undefined)).toEqual({ from: 1, to: Infinity });
  });
});

describe('tamanosUnidad / tamanoMinimoUnidad / tamanoUnidadLista', () => {
  it('collects unit sizes from every pricing tier, largest first', () => {
    expect(tamanosUnidad(TERMINATOR_PRICING)).toEqual([10, 5]);
  });

  it('reports the smallest legal unit size', () => {
    expect(tamanoMinimoUnidad(TERMINATOR_PRICING)).toBe(5);
  });

  it('picks the exact size when registered, else rounds down to a legal size', () => {
    expect(tamanoUnidadLista(TERMINATOR_PRICING, 10)).toBe(10);
    expect(tamanoUnidadLista(TERMINATOR_PRICING, 7)).toBe(5);
    expect(tamanoUnidadLista(TERMINATOR_PRICING, 1)).toBe(5);
  });
});

describe('costeUnidad / costeCopia', () => {
  it('prices a copy using the tier for that copy number', () => {
    expect(costeUnidad(TERMINATOR_PRICING, 1, 5)).toBe(150);
    expect(costeUnidad(TERMINATOR_PRICING, 2, 5)).toBe(150);
    expect(costeUnidad(TERMINATOR_PRICING, 3, 5)).toBe(175);
  });

  it('costeCopia always prices the smallest legal unit', () => {
    expect(costeCopia(TERMINATOR_PRICING, 1)).toBe(150);
    expect(costeCopia(TERMINATOR_PRICING, 3)).toBe(175);
  });
});

describe('opcionesComposicion', () => {
  it('lists each unit size with its 1st-copy price, smallest first', () => {
    expect(opcionesComposicion(TERMINATOR_PRICING)).toEqual([
      { models: 5, points: 150 },
      { models: 10, points: 300 },
    ]);
  });
});

describe('puntosEjercito (army collection points)', () => {
  it('prices every unit at the minimum size and 1st-copy cost, regardless of copy tiers', () => {
    // 5 models = one minimum-size unit at 1st-copy cost.
    expect(puntosEjercito(TERMINATOR_PRICING, 5)).toBe(150);
    // 10 models = two minimum-size units, both still at 1st-copy cost (150 each).
    expect(puntosEjercito(TERMINATOR_PRICING, 10)).toBe(300);
    // 15 models = three units of 5 at 150 each = 450, NOT the list-tier price.
    expect(puntosEjercito(TERMINATOR_PRICING, 15)).toBe(450);
  });

  it('returns 0 for no models or missing pricing', () => {
    expect(puntosEjercito(TERMINATOR_PRICING, 0)).toBe(0);
    expect(puntosEjercito(null, 5)).toBe(0);
    expect(puntosEjercito([], 5)).toBe(0);
  });
});

describe('puntosListaPorFilas / puntosListaTotal (list points)', () => {
  it('prices each copy by its MFM copy-tier — 3rd+ copies can cost more than collection points', () => {
    const rows = [
      {
        id: 'row-1',
        quantity: 3, // three separate 5-model squads added to the list
        miniature: { quantity: 5, pointsSnapshot: TERMINATOR_PRICING },
      },
    ];
    // copy 1 (150) + copy 2 (150) + copy 3 (175) = 475, not 3 x 150 = 450.
    expect(puntosListaTotal(rows)).toBe(475);
    expect(puntosListaPorFilas(rows).get('row-1')).toBe(475);
  });

  it('groups rows of the same catalog unit so copy tiers carry across rows', () => {
    const rows = [
      {
        id: 'row-1',
        quantity: 2,
        miniature: { catalogUnitId: 'terminators', quantity: 5, pointsSnapshot: TERMINATOR_PRICING },
      },
      {
        id: 'row-2',
        quantity: 1,
        miniature: { catalogUnitId: 'terminators', quantity: 5, pointsSnapshot: TERMINATOR_PRICING },
      },
    ];
    const perRow = puntosListaPorFilas(rows);
    // row-1 takes copies 1-2 (150 + 150 = 300), row-2 takes copy 3 (175).
    expect(perRow.get('row-1')).toBe(300);
    expect(perRow.get('row-2')).toBe(175);
    expect(puntosListaTotal(rows)).toBe(475);
  });

  it('returns 0 for an empty list', () => {
    expect(puntosListaTotal([])).toBe(0);
  });
});
