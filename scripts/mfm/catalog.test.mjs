import { describe, expect, it } from 'vitest';
import { pricingDelta } from './catalog.mjs';

const tier = (...points) => [{ label: '', costs: points.map((p, i) => ({ models: (i + 1) * 5, points: p })) }];

describe('pricingDelta', () => {
  it('reports a change in the first cost option', () => {
    expect(pricingDelta(tier(80, 160), tier(95, 160))).toEqual({ before: 80, after: 95, delta: 15, models: 5 });
  });

  it('reports a change that only affects a later tier', () => {
    expect(pricingDelta(tier(80, 160), tier(80, 150))).toEqual({ before: 160, after: 150, delta: -10, models: 10 });
  });

  it('ignores addon costs', () => {
    const old = [{ label: '', costs: [{ models: 1, points: 10, addon: true }, { models: 5, points: 80 }] }];
    const next = [{ label: '', costs: [{ models: 1, points: 25, addon: true }, { models: 5, points: 80 }] }];
    expect(pricingDelta(old, next)).toBeNull();
  });

  it('returns null when nothing comparable changed', () => {
    expect(pricingDelta(tier(80), tier(80))).toBeNull();
    expect(pricingDelta(null, tier(80))).toBeNull();
  });
});
