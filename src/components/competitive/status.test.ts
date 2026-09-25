import { describe, expect, it } from 'vitest';
import { daysUntil, formatDateRange } from './status';

describe('daysUntil', () => {
  const now = new Date(2026, 8, 25, 18, 30);
  it('counts whole calendar days regardless of the time of day', () => {
    expect(daysUntil('2026-09-25', now)).toBe(0);
    expect(daysUntil('2026-09-26', now)).toBe(1);
    expect(daysUntil('2026-10-05', now)).toBe(10);
    expect(daysUntil('2026-09-20', now)).toBe(-5);
  });
  it('is null without a date', () => {
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe('formatDateRange', () => {
  it('handles missing, single-day and multi-day tournaments', () => {
    expect(formatDateRange({ startDate: null, endDate: null })).toBe('Fecha por anunciar');
    expect(formatDateRange({ startDate: '2026-10-05', endDate: '2026-10-05' })).toBe('5 de octubre de 2026');
    expect(formatDateRange({ startDate: '2026-10-05', endDate: '2026-10-06' })).toBe('5 de octubre – 6 de octubre de 2026');
  });
});
