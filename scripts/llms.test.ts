import { describe, expect, it } from 'vitest';
import { buildLlms, loadLlmsData } from '../api/llms';

const data = {
  factions: [
    { faction_slug: 'thousand-sons', faction_name: 'Thousand Sons' },
    { faction_slug: 'orks', faction_name: 'Orks' },
  ],
  version: '1.5',
  lastChanges: [
    { title: 'Rubric Marines - Thousand Sons', points_delta: 15, occurred_at: '2026-10-02T10:00:00Z' },
    { title: 'Boyz - Orks', points_delta: -5, occurred_at: '2026-10-02T09:00:00Z' },
    { title: 'Old - Orks', points_delta: 5, occurred_at: '2026-09-01T09:00:00Z' },
  ],
  tournaments: [{ id: 't1', name: 'GT Talavera', location: 'Talavera', start_date: '2026-10-30' }],
};

describe('llms.txt', () => {
  it('summarises the site with sections, factions and the MFM version', () => {
    const txt = buildLlms(data, false);
    expect(txt.startsWith('# Administratum\n\n> ')).toBe(true);
    expect(txt).toContain('Versión actual del Munitorum Field Manual: 1.5.');
    expect(txt).toContain('- [Cambios de puntos](https://administratum.site/cambios-puntos)');
    expect(txt).toContain('- [Puntos de Thousand Sons](https://administratum.site/catalogo-puntos/thousand-sons)');
    expect(txt).toContain('https://administratum.site/llms-full.txt');
    expect(txt).not.toContain('GT Talavera');
    expect(txt).not.toMatch(/\n\n\n/);
  });

  it('adds the latest points update and tournaments in the full version', () => {
    const txt = buildLlms(data, true);
    expect(txt).toContain('2 unidades cambian de puntos (1 suben, 1 bajan)');
    expect(txt).toContain('- Rubric Marines - Thousand Sons: +15 pts');
    expect(txt).not.toContain('Old - Orks');
    expect(txt).toContain('[GT Talavera](https://administratum.site/competitivo/torneos/t1)');
  });

  it('survives a failing data source', async () => {
    const d = await loadLlmsData(async (table) => {
      if (table === 'tournaments') throw new Error('down');
      return [];
    });
    expect(d.tournaments).toEqual([]);
    expect(buildLlms(d, true)).toContain('No hay torneos próximos publicados.');
  });
});
