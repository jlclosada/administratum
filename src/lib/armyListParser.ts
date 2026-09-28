/**
 * Parses the plain-text army list export of list-builder apps (the official
 * app / NewRecruit), in Spanish or English: a header line with the list name
 * and total points, the faction, an optional detachment, a few optional
 * notes (battle size, force dispositions…), then units grouped under
 * ALL-CAPS category headers, each with "•"/"◦" bullet lines. English
 * exports can also group a leader with its bodyguard under "Attached unit N".
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
  /** Label shared by units attached together, e.g. "Attached unit 1". */
  group?: string;
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
  /** Game size line, e.g. { name: "Strike Force", points: 2000 }. */
  battleSize?: { name: string; points: number } | null;
  /** Other lines before the first category, e.g. "Force Dispositions: …". */
  notes?: string[];
  /** Language of the export it was parsed from (drives serializeArmyList). */
  language?: "es" | "en";
  categories: ArmyListCategory[];
}

// "1,995" / "2.270" / "2 000" / "455" — separators are stripped by toInt.
const NUM = String.raw`(\d{1,3}(?:[.,\s]\d{3})+|\d+)`;
const toInt = (s: string | undefined) => Number((s ?? "").replace(/[.,\s]/g, ""));

const LIST_HEADER_RE = new RegExp(String.raw`^(.+?)\s*\(${NUM}\s*(?:puntos|points?|pts)\)\s*$`, "i");
const DETACHMENT_RE = new RegExp(
  String.raw`^(.+?)\s*\(${NUM}\s*(?:puntos de destacamento|detachment points?)\)\s*$`,
  "i",
);
const POINTS_LINE_RE = new RegExp(String.raw`^(.+?)\s*\(${NUM}\s*(?:points?|puntos|pts)\)\s*$`, "i");
const BULLET_RE = /^\s*([•◦▪])\s*(.+?)\s*$/;
const GROUP_RE = /^(?:attached unit|unidad(?:es)? (?:adjunta|agregada|unida)s?)\s*#?\d+$/i;
const FOOTER_RE = /^(?:exportad[ao] con|exported with|created with|creada con)/i;

/** All-caps section header ("PERSONAJE", "OTHER DATASHEETS"...): no digits, no parens, no lowercase. */
function isCategoryHeader(line: string): boolean {
  const t = line.trim();
  if (!t || POINTS_LINE_RE.test(t)) return false;
  return /^[^a-z0-9(){}]+$/.test(t) && /[A-ZÀ-Ý]/.test(t);
}

export function parseArmyListExport(raw: string): ParsedArmyList | null {
  const lines = raw.split(/\r?\n/);
  const next = (i: number) => {
    while (i < lines.length && !(lines[i] ?? "").trim()) i++;
    return i;
  };

  let i = next(0);
  const headerMatch = (lines[i] ?? "").trim().match(LIST_HEADER_RE);
  if (!headerMatch) return null;
  const listName = (headerMatch[1] ?? "").trim();
  const language: "es" | "en" = /puntos\)\s*$/i.test((lines[i] ?? "").trim()) ? "es" : "en";
  const totalPoints = toInt(headerMatch[2]);

  i = next(i + 1);
  const factionName = (lines[i] ?? "").trim();
  if (!factionName || isCategoryHeader(factionName) || POINTS_LINE_RE.test(factionName)) return null;

  let detachmentName: string | null = null;
  let detachmentPoints: number | null = null;
  i = next(i + 1);
  const detachmentMatch = (lines[i] ?? "").trim().match(DETACHMENT_RE);
  if (detachmentMatch) {
    detachmentName = (detachmentMatch[1] ?? "").trim();
    detachmentPoints = toInt(detachmentMatch[2]);
    i++;
  }

  const categories: ArmyListCategory[] = [];
  const notes: string[] = [];
  let battleSize: ParsedArmyList["battleSize"] = null;
  let currentCategory: ArmyListCategory | null = null;
  let currentUnit: ArmyListUnit | null = null;
  let currentGroup: string | null = null;

  for (; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (FOOTER_RE.test(trimmed)) break;

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch && currentUnit) {
      currentUnit.bullets.push({
        text: bulletMatch[2] ?? "",
        depth: bulletMatch[1] === "◦" ? 1 : 0,
      });
      continue;
    }

    if (isCategoryHeader(trimmed)) {
      currentCategory = { name: trimmed, units: [] };
      categories.push(currentCategory);
      currentUnit = null;
      currentGroup = null;
      continue;
    }

    const unitMatch = trimmed.match(POINTS_LINE_RE);
    if (!currentCategory) {
      // Before the first category: the battle size line ("Strike Force
      // (2,000 Points)") and free notes ("Force Dispositions: …").
      if (unitMatch && !battleSize) {
        battleSize = { name: (unitMatch[1] ?? "").trim(), points: toInt(unitMatch[2]) };
      } else {
        notes.push(trimmed);
      }
      continue;
    }

    if (GROUP_RE.test(trimmed)) {
      currentGroup = trimmed;
      currentUnit = null;
      continue;
    }

    if (unitMatch) {
      currentUnit = {
        name: (unitMatch[1] ?? "").trim(),
        points: toInt(unitMatch[2]),
        bullets: [],
        ...(currentGroup ? { group: currentGroup } : {}),
      };
      currentCategory.units.push(currentUnit);
      continue;
    }
    // Unrecognized line (e.g. a stray note) — ignore rather than guess.
  }

  const nonEmpty = categories.filter((c) => c.units.length > 0);
  if (nonEmpty.length === 0) return null;

  return {
    listName,
    totalPoints,
    factionName,
    detachmentName,
    detachmentPoints,
    battleSize,
    notes,
    language,
    categories: nonEmpty,
  };
}

/** Sum of every unit's points — useful to sanity-check the header total. */
export function sumUnitPoints(list: ParsedArmyList): number {
  return list.categories.reduce((n, c) => n + c.units.reduce((m, u) => m + u.points, 0), 0);
}

/** The export's language; lists stored before `language` existed are guessed from their headers. */
export function listLanguage(list: ParsedArmyList): "es" | "en" {
  if (list.language) return list.language;
  const text = [...list.categories.map((c) => c.name), list.battleSize?.name ?? ""].join(" ");
  return /[ÁÉÍÓÚÑ]|PERSONAJE|BATALLA|TRANSPORTE|OTRAS|HOJAS|UNIDADES|Fuerza|Incursi/i.test(text) ? "es" : "en";
}

/**
 * Inverse of parseArmyListExport: writes the list back in the export format
 * it came from (Spanish: indented bullets, "puntos"; English: flat bullets,
 * "Points", thousands separators), so it can be pasted into list builders
 * or shared as text. parse(serialize(list)) reproduces the list.
 */
export function serializeArmyList(list: ParsedArmyList): string {
  const es = listLanguage(list) === "es";
  const n = (v: number) => (es ? String(v) : v.toLocaleString("en-US"));
  const out: string[] = [`${list.listName} (${n(list.totalPoints)} ${es ? "puntos" : "Points"})`, "", list.factionName];
  if (list.detachmentName) {
    out.push(`${list.detachmentName} (${list.detachmentPoints ?? 0} ${es ? "puntos de destacamento" : "Detachment Points"})`);
  }
  out.push(...(list.notes ?? []));
  if (list.battleSize) out.push(`${list.battleSize.name} (${n(list.battleSize.points)} Points)`);

  for (const category of list.categories) {
    out.push("", category.name);
    let group: string | undefined;
    for (const unit of category.units) {
      if (unit.group && unit.group !== group) out.push("", unit.group);
      group = unit.group;
      out.push("", `${unit.name} (${n(unit.points)} Points)`);
      for (const b of unit.bullets) {
        out.push(es ? `${b.depth > 0 ? "     ◦" : "  •"} ${b.text}` : `${b.depth > 0 ? "◦" : "•"} ${b.text}`);
      }
    }
  }
  return `${out.join("\n")}\n`;
}

/** "3-1-0" → "3V · 1D · 0E"; null when the string isn't a valid V-D-E triple. */
export function formatResult(result: string | null | undefined): string | null {
  if (!result) return null;
  const parts = result.split("-").map((n) => Number(n.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [v, d, e] = parts;
  return `${v}V · ${d}D · ${e}E`;
}

/** Builds the stored "V-D-E" string from three optional inputs; null if all are empty. */
export function buildResult(victories: string, defeats: string, draws: string): string | null {
  if (!victories.trim() && !defeats.trim() && !draws.trim()) return null;
  return `${victories || 0}-${defeats || 0}-${draws || 0}`;
}
