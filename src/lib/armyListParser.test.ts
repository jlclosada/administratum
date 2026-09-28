import { describe, expect, it } from 'vitest';
import EN from './__fixtures__/thousandSonsEnglish.txt?raw';
import { buildResult, formatResult, listLanguage, parseArmyListExport, serializeArmyList, sumUnitPoints } from './armyListParser';

const SAMPLE = `Talavera (2270 puntos)

Mil Hijos
Grand Coven (3 puntos de destacamento)
Activos prioritarios
Fuerza de Choque (2000 Points)

PERSONAJE

Daemon Prince of Tzeentch with Wings (205 Points)
  • 1x Dark Blessing
  • 1x Hellforged weapons
  • 1x Infernal cannon
  • Mejoras: Eldritch Vortex of E'Taph

Magnus the Red (455 Points)
  • Señor de la guerra
  • 1x Blade of Magnus

LÍNEA DE BATALLA

Rubric Marines (100 Points)
  • 1x Aspiring Sorcerer
     ◦ 1x Force weapon
     ◦ 1x Inferno bolt pistol
  • 4x Rubric Marine
     ◦ 4x Close combat weapon

TRANSPORTES DEDICADOS

Chaos Rhino (80 Points)
  • 1x Armoured tracks

OTRAS HOJAS DE DATOS

Chaos Spawn (65 Points)
  • 2x Chaos Spawn
     ◦ 2x Hideous mutations

Chaos Spawn (65 Points)
  • 2x Chaos Spawn
     ◦ 2x Hideous mutations

Exportada con la versión de la app: v2.6.0 (3), versión de los datos v946`;

describe('parseArmyListExport', () => {
  it('extracts the list header, faction and detachment', () => {
    const result = parseArmyListExport(SAMPLE);
    expect(result?.listName).toBe('Talavera');
    expect(result?.totalPoints).toBe(2270);
    expect(result?.factionName).toBe('Mil Hijos');
    expect(result?.detachmentName).toBe('Grand Coven');
    expect(result?.detachmentPoints).toBe(3);
  });

  it('groups units under their ALL-CAPS category, in order', () => {
    const result = parseArmyListExport(SAMPLE);
    expect(result?.categories.map((c) => c.name)).toEqual([
      'PERSONAJE',
      'LÍNEA DE BATALLA',
      'TRANSPORTES DEDICADOS',
      'OTRAS HOJAS DE DATOS',
    ]);
    expect(result?.categories[0]?.units).toHaveLength(2);
    expect(result?.categories[3]?.units).toHaveLength(2);
  });

  it('does not mistake the force-org header for a unit', () => {
    const result = parseArmyListExport(SAMPLE);
    const names = result?.categories.flatMap((c) => c.units.map((u) => u.name));
    expect(names).not.toContain('Fuerza de Choque');
  });

  it('reads unit points and nested bullet depth correctly', () => {
    const result = parseArmyListExport(SAMPLE);
    const rubric = result?.categories[1]?.units[0];
    expect(rubric?.name).toBe('Rubric Marines');
    expect(rubric?.points).toBe(100);
    expect(rubric?.bullets).toEqual([
      { text: '1x Aspiring Sorcerer', depth: 0 },
      { text: '1x Force weapon', depth: 1 },
      { text: '1x Inferno bolt pistol', depth: 1 },
      { text: '4x Rubric Marine', depth: 0 },
      { text: '4x Close combat weapon', depth: 1 },
    ]);
  });

  it('keeps duplicate unit entries (two identical Chaos Spawn units) separate', () => {
    const result = parseArmyListExport(SAMPLE);
    expect(result?.categories[3]?.units.map((u) => u.name)).toEqual(['Chaos Spawn', 'Chaos Spawn']);
  });

  it('stops at the export footer line', () => {
    const withTrailingJunk = `${SAMPLE}\nThis should never appear (999 Points)`;
    const result = parseArmyListExport(withTrailingJunk);
    const names = result?.categories.flatMap((c) => c.units.map((u) => u.name));
    expect(names).not.toContain('This should never appear');
  });

  it('returns null for text that is not a recognizable army list export', () => {
    expect(parseArmyListExport('just some random text')).toBeNull();
    expect(parseArmyListExport('')).toBeNull();
  });

  it('returns null when the header parses but no units follow', () => {
    expect(parseArmyListExport('Empty List (0 puntos)\n\nSome Faction')).toBeNull();
  });
});

describe('formatResult / buildResult', () => {
  it('formats a V-D-E triple', () => {
    expect(formatResult('3-1-0')).toBe('3V · 1D · 0E');
  });

  it('rejects malformed results', () => {
    expect(formatResult('3-1')).toBeNull();
    expect(formatResult('a-b-c')).toBeNull();
    expect(formatResult(null)).toBeNull();
  });

  it('builds a result only when something was entered', () => {
    expect(buildResult('', '', '')).toBeNull();
    expect(buildResult('4', '', '1')).toBe('4-0-1');
  });
});

describe('parseArmyListExport — English export', () => {
  const list = parseArmyListExport(EN);

  it('reads the header with thousands separators and the (Copy) suffix', () => {
    expect(list?.listName).toBe('Magic terms + mag (Copy)');
    expect(list?.totalPoints).toBe(1995);
    expect(list?.factionName).toBe('Thousand Sons');
  });

  it('reads the English detachment, battle size and dispositions', () => {
    expect(list?.detachmentName).toBe('Hexwarp Thrallband and Sekhetar Cohort');
    expect(list?.detachmentPoints).toBe(3);
    expect(list?.battleSize).toEqual({ name: 'Strike Force', points: 2000 });
    expect(list?.notes).toEqual(['Force Dispositions: Priority Assets, Take and Hold']);
  });

  it('keeps every unit, and their points add up to the header total', () => {
    expect(list?.categories.map((c) => [c.name, c.units.length])).toEqual([
      ['ATTACHED UNITS', 6],
      ['CHARACTERS', 3],
      ['OTHER DATASHEETS', 7],
    ]);
    expect(list && sumUnitPoints(list)).toBe(1995);
  });

  it('groups leaders with their bodyguard units', () => {
    const attached = list?.categories[0]?.units ?? [];
    expect(attached.map((u) => `${u.group}: ${u.name}`)).toEqual([
      'Attached unit 1: Sorcerer in Terminator Armour',
      'Attached unit 1: Scarab Occult Terminators',
      'Attached unit 2: Sorcerer',
      'Attached unit 2: Rubric Marines',
      'Attached unit 3: Sorcerer',
      'Attached unit 3: Rubric Marines',
    ]);
    expect(list?.categories[1]?.units[0]?.group).toBeUndefined();
  });

  it('reads bullets written without indentation, by glyph', () => {
    const terminators = list?.categories[0]?.units[1];
    expect(terminators?.bullets.slice(0, 3)).toEqual([
      { text: 'Attached as: Bodyguard ()', depth: 0 },
      { text: '1x Scarab Occult Sorcerer', depth: 0 },
      { text: '1x Force weapon', depth: 1 },
    ]);
  });

  it('stops at an English footer', () => {
    const withFooter = `${EN}\nExported with App Version: v2.6.0\nJunk (999 Points)`;
    const names = parseArmyListExport(withFooter)?.categories.flatMap((c) => c.units.map((u) => u.name));
    expect(names).not.toContain('Junk');
  });
});

describe('parseArmyListExport — number formats', () => {
  it('accepts Spanish thousands separators', () => {
    const list = parseArmyListExport('Lista (2.270 puntos)\n\nNecrones\n\nPERSONAJE\n\nOverlord (1.085 Points)');
    expect(list?.totalPoints).toBe(2270);
    expect(list?.categories[0]?.units[0]?.points).toBe(1085);
  });
});

describe('serializeArmyList (Copiar lista)', () => {
  it('round-trips the English export', () => {
    const list = parseArmyListExport(EN)!;
    const text = serializeArmyList(list);
    expect(text.startsWith('Magic terms + mag (Copy) (1,995 Points)\n\nThousand Sons\n')).toBe(true);
    expect(text).toContain('Hexwarp Thrallband and Sekhetar Cohort (3 Detachment Points)');
    expect(text).toContain('Strike Force (2,000 Points)');
    expect(text).toContain('\nAttached unit 1\n\nSorcerer in Terminator Armour (95 Points)\n• Attached as: Leader (Character)');
    expect(parseArmyListExport(text)).toEqual(list);
  });

  it('round-trips the Spanish export with its own formatting', () => {
    const list = parseArmyListExport(SAMPLE)!;
    expect(list.language).toBe('es');
    const text = serializeArmyList(list);
    expect(text.startsWith('Talavera (2270 puntos)\n\nMil Hijos\nGrand Coven (3 puntos de destacamento)\n')).toBe(true);
    expect(text).toContain('  • 1x Aspiring Sorcerer\n     ◦ 1x Force weapon');
    expect(parseArmyListExport(text)).toEqual(list);
  });

  it('guesses the language of lists stored before it was recorded', () => {
    const { language: _es, ...legacyEs } = parseArmyListExport(SAMPLE)!;
    const { language: _en, ...legacyEn } = parseArmyListExport(EN)!;
    expect(listLanguage(legacyEs)).toBe('es');
    expect(listLanguage(legacyEn)).toBe('en');
  });
});
