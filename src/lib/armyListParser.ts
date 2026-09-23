/**
 * Parses the plain-text army list export format used by list-builder apps
 * (e.g. NewRecruit's Spanish export): a header line with the list name and
 * total points, a faction, a detachment, then units grouped under ALL-CAPS
 * category headers, each with "•"/"◦" bullet lines for wargear and models.
 *
 * Best-effort: unrecognized lines are dropped rather than throwing, since
 * this only ever runs against text a user pasted by hand.
 */

export interface ArmyListBullet {
  text: string;
  /** 0 = "•" (model/wargear line), 1 = "◦" (nested wargear under a model). */
  depth: number;
}

export interface ArmyListUnit {
  name: string;
  points: number;
  bullets: ArmyListBullet[];
}

export interface ArmyListCategory {
  name: string;
  units: ArmyListUnit[];
}

export interface ParsedArmyList {
  listName: string;
  totalPoints: number;
  factionName: string;
  detachmentName: string | null;
  detachmentPoints: number | null;
  categories: ArmyListCategory[];
}

const LIST_HEADER_RE = /^(.+?)\s*\((\d+)\s*puntos\)\s*$/i;
const DETACHMENT_RE = /^(.+?)\s*\((\d+)\s*puntos de destacamento\)\s*$/i;
const POINTS_LINE_RE = /^(.+?)\s*\((\d+)\s*Points?\)\s*$/;
const BULLET_RE = /^\s*([•◦])\s*(.+?)\s*$/;
const FOOTER_RE = /^Exportada con/i;

/** All-caps section header ("PERSONAJE", "LÍNEA DE BATALLA"...): no digits, no parens, no lowercase. */
function isCategoryHeader(line: string): boolean {
  const t = line.trim();
  if (!t || POINTS_LINE_RE.test(t)) return false;
  return /^[^a-z0-9(){}]+$/.test(t) && /[A-ZÀ-Ý]/.test(t);
}

export function parseArmyListExport(raw: string): ParsedArmyList | null {
  const lines = raw.split(/\r?\n/);

  let i = 0;
  while (i < lines.length && !(lines[i] ?? "").trim()) i++;
  const headerMatch = (lines[i] ?? "").trim().match(LIST_HEADER_RE);
  if (!headerMatch) return null;
  const listName = (headerMatch[1] ?? "").trim();
  const totalPoints = Number(headerMatch[2]);
  i++;

  while (i < lines.length && !(lines[i] ?? "").trim()) i++;
  const factionName = (lines[i] ?? "").trim();
  i++;

  let detachmentName: string | null = null;
  let detachmentPoints: number | null = null;
  while (i < lines.length && !(lines[i] ?? "").trim()) i++;
  const detachmentMatch = (lines[i] ?? "").trim().match(DETACHMENT_RE);
  if (detachmentMatch) {
    detachmentName = (detachmentMatch[1] ?? "").trim();
    detachmentPoints = Number(detachmentMatch[2]);
    i++;
  }

  const categories: ArmyListCategory[] = [];
  let currentCategory: ArmyListCategory | null = null;
  let currentUnit: ArmyListUnit | null = null;
  let sawFirstCategory = false;

  for (; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (FOOTER_RE.test(trimmed)) break;

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch && currentUnit) {
      currentUnit.bullets.push({
        text: bulletMatch[2] ?? "",
        depth: bulletMatch[1] === "•" ? 0 : 1,
      });
      continue;
    }

    if (isCategoryHeader(trimmed)) {
      currentCategory = { name: trimmed, units: [] };
      categories.push(currentCategory);
      currentUnit = null;
      sawFirstCategory = true;
      continue;
    }

    const unitMatch = trimmed.match(POINTS_LINE_RE);
    if (unitMatch) {
      // Before the first category header, a "(N Points)" line is the force
      // org header (e.g. "Fuerza de Choque (2000 Points)"), not a unit.
      if (!sawFirstCategory) continue;
      if (!currentCategory) {
        currentCategory = { name: "Unidades", units: [] };
        categories.push(currentCategory);
      }
      currentUnit = { name: (unitMatch[1] ?? "").trim(), points: Number(unitMatch[2]), bullets: [] };
      currentCategory.units.push(currentUnit);
      continue;
    }
    // Unrecognized line (e.g. a stray note) — ignore rather than guess.
  }

  if (categories.every((c) => c.units.length === 0)) return null;

  return { listName, totalPoints, factionName, detachmentName, detachmentPoints, categories };
}
