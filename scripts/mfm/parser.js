import { load } from "cheerio";

const VERSION_RE = /v(\d+\.\d+)/;
const TRAILING_POINTS_RE = /([\d,]+)\s*pts\s*$/i;
const PLAIN_SIZE_RE = /^\d+ models?$/i;
const ORDINAL_RE = /(\d+)(?:st|nd|rd|th)/gi;
const UNIQUE_RE = /^\s*unique:\s*/i;
const DELTA_MARKER_RE = /[▲▼]\s*(?:\([+-]\d+\)\s*)?/g;
const CARD_SELECTOR = "div.flex.flex-col.space-y-1.m-1";
const PARENT_TITLE_SELECTOR = 'h3.font-header:not([class*="break-after"])';

function clean(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(s) {
  return clean(s)
    .toLowerCase()
    .replace(/(^|[\s'’(-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function leadingInt(s) {
  const m = String(s).match(/-?\d+/);
  return m ? Number.parseInt(m[0], 10) : null;
}

function parseRange(label) {
  const ords = [...label.matchAll(ORDINAL_RE)].map((m) => Number.parseInt(m[1], 10));
  if (ords.length === 0) return "[1,)";
  const from = ords[0];
  if (/\bto\b/i.test(label) && ords.length >= 2) return `[${from},${ords[1]}]`;
  if (label.includes("+")) return `[${from},)`;
  return `[${from},${from}]`;
}

function parseCostRow(unitName, raw) {
  const text = clean(raw.replace(DELTA_MARKER_RE, ""));
  const m = text.match(TRAILING_POINTS_RE);
  const size = m ? clean(text.slice(0, m.index)) : "";
  if (!m || !size) {
    throw new Error(`Unidad "${unitName}": fila de coste ilegible "${text}"`);
  }
  const points = Number.parseInt(m[1].replace(/,/g, ""), 10);
  const models = (size.match(/\d+/g) ?? []).reduce((sum, n) => sum + Number.parseInt(n, 10), 0);
  if (size.startsWith("+")) {
    const item = clean(size.replace(/^\+\s*\d*\s*/, ""));
    return item ? { models, points, desc: item, addon: true } : { models, points, addon: true };
  }
  return PLAIN_SIZE_RE.test(size) ? { models, points } : { models, points, desc: size };
}

function hydrate($) {
  const completions = new Map();
  $('div[hidden][id^="S:"]').each((_, el) => {
    completions.set($(el).attr("id").slice(2), $(el));
  });

  let changed = true;
  for (let guard = 0; changed && guard < 100; guard += 1) {
    changed = false;
    $("template[id]").each((_, el) => {
      const suffix = ($(el).attr("id") ?? "").split(":")[1];
      const src = suffix ? completions.get(suffix) : undefined;
      if (src) {
        $(el).replaceWith(src.html() ?? "");
        changed = true;
      }
    });
  }
  $('div[hidden][id^="S:"]').remove();
}

function deannotate($) {
  const badges = new Set(["UPDATED", "FORCE DISPOSITION(S) CHANGED", "REQUISITION THRESHOLDS REMOVED", "UNIQUE TAG REMOVED"]);
  $("div").each((_, el) => {
    if (badges.has(clean($(el).text()))) $(el).remove();
  });
  $("span").each((_, el) => {
    const span = $(el);
    if (span.children().length > 0) return;
    const text = span.text();
    if (/[▲▼]/.test(text)) span.text(clean(text.replace(DELTA_MARKER_RE, "")));
  });
}

function cardName(card) {
  const header = card.children().first();
  const span = header.find("span.text-xl").first();
  return clean(span.length > 0 ? span.text() : header.text());
}

function isUnitCard($, card) {
  return card.find("div.bg-slate-200").filter((_, el) => /COST/i.test($(el).text())).length > 0;
}

function topCards($) {
  return $(CARD_SELECTOR).filter((_, el) => $(el).parents(CARD_SELECTOR).length === 0);
}

function parseRole(card) {
  const out = {};
  const imgs = card.find('img[src$="leader.svg"], img[src$="support.svg"]');
  imgs.each((_, el) => {
    const img = card.find(el);
    const key = (img.attr("src") ?? "").includes("leader") ? "leaderTo" : "supportTo";
    const attachTo = clean(img.parent().nextAll("span").first().text())
      .split(",")
      .map((s) => titleCase(s))
      .filter(Boolean);
    if (attachTo.length > 0) out[key] = attachTo;
  });
  return out;
}

function parseWargear($, card) {
  const cog = card.find('img[src$="cog.svg"]').first();
  if (cog.length === 0) return [];
  return cog
    .parent()
    .parent()
    .find("ul li")
    .map((_, li) => {
      const spans = $(li).find("span");
      const item = clean(spans.first().text()).replace(/^per\s+/i, "");
      const points = leadingInt(clean(spans.last().text()).replace(DELTA_MARKER_RE, ""));
      return item && points !== null ? { item, points } : null;
    })
    .get()
    .filter(Boolean);
}

function parseUnit($, card) {
  const name = titleCase(cardName(card));
  const pricing = [];
  card.find("div.bg-slate-200").each((_, labelEl) => {
    const label = titleCase($(labelEl).text());
    const ul = $(labelEl).nextAll("ul.leaders").first();
    const costs = ul
      .find("li")
      .map((_, li) => parseCostRow(name, clean($(li).text())))
      .get();
    if (costs.length > 0) pricing.push({ range: parseRange(label), label, costs });
  });
  if (pricing.length === 0) throw new Error(`Unidad "${name}" sin costes`);
  const wargear = parseWargear($, card);
  return {
    name,
    pricing,
    ...parseRole(card),
    ...(wargear.length > 0 ? { wargear } : {}),
  };
}

function enhancementGrant($, li, keyword) {
  return clean(
    li
      .parent()
      .find("span")
      .filter((_, s) => clean($(s).text()) === keyword)
      .first()
      .nextAll("span")
      .first()
      .text()
  )
    .split(",")
    .map((s) => titleCase(s))
    .filter(Boolean);
}

function parseDetachment($, card) {
  const header = card.children().first();
  const name = titleCase(cardName(card));
  const dp = leadingInt(clean(header.find("span.self-end").last().text()));
  const objectives = card
    .children("div[style]")
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean);
  const unique = titleCase(
    clean(
      card
        .children("div.bg-slate-200")
        .filter((_, el) => UNIQUE_RE.test(clean($(el).text())))
        .first()
        .text()
    ).replace(UNIQUE_RE, "")
  );
  const enhancements = card
    .find("ul.leaders li")
    .map((_, el) => {
      const li = $(el);
      const spans = li.find("div").last().find("span");
      const enhName = clean(spans.first().text());
      const points = leadingInt(clean(spans.last().text()));
      if (!enhName || points === null) return null;
      const leaderTo = enhancementGrant($, li, "LEADER:");
      const supportTo = enhancementGrant($, li, "SUPPORT:");
      return {
        name: enhName,
        points,
        ...(leaderTo.length > 0 ? { leaderTo } : {}),
        ...(supportTo.length > 0 ? { supportTo } : {}),
      };
    })
    .get()
    .filter(Boolean);

  return { name, dp, objectives, ...(unique ? { unique } : {}), enhancements };
}

export function parseVersion(html) {
  const m = html.match(VERSION_RE);
  return m ? m[1] : null;
}

export function parseIndex(html) {
  const $ = load(html);
  const version = parseVersion(html);
  const seen = new Map();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(/^\/en\/([a-z0-9-]+)$/);
    if (!m) return;
    const slug = m[1];
    const name = clean($(el).text());
    const img = $(el).find("img").first();
    const raw = img.attr("src") || img.attr("srcset") || "";
    const decoded = decodeURIComponent(raw);
    const file = decoded.match(/(\/factions\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp))/i);
    const image = file ? file[1] : null;
    if (name && !seen.has(slug)) seen.set(slug, { slug, name, image });
  });
  if (seen.size === 0) throw new Error("No se encontraron ejércitos en el índice del MFM");
  return { version, factions: [...seen.values()] };
}

export function parseFaction(html, slug, name, knownFactions = new Set()) {
  const $ = load(html);
  const version = parseVersion(html);
  if (!version) throw new Error(`Sin versión en "${slug}"`);
  hydrate($);
  deannotate($);

  const groupByCard = new Map();
  let currentGroup;
  $(`h3.font-header, ${CARD_SELECTOR}`).each((_, el) => {
    if (el.tagName === "h3") {
      const isSection = ($(el).attr("class") ?? "").includes("break-after");
      currentGroup = isSection ? undefined : titleCase($(el).text());
    } else if (isUnitCard($, $(el))) {
      groupByCard.set(el, currentGroup);
    }
  });

  const units = [];
  const detachments = [];
  topCards($).each((_, el) => {
    const card = $(el);
    if (isUnitCard($, card)) {
      const unit = parseUnit($, card);
      const group = groupByCard.get(el);
      units.push(group ? { ...unit, groupTitle: group } : unit);
    } else {
      detachments.push(parseDetachment($, card));
    }
  });

  if (units.length === 0) {
    throw new Error(`Sin unidades en "${slug}". El HTML del MFM puede haber cambiado.`);
  }

  const groupTitles = $(PARENT_TITLE_SELECTOR)
    .map((_, el) => titleCase($(el).text()))
    .get();
  const parent = groupTitles.find((t) => t.toLowerCase() !== name.toLowerCase() && knownFactions.has(t.toLowerCase()));

  return { slug, name, version, ...(parent ? { parent } : {}), detachments, units };
}
