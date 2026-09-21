import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFaction, parseIndex } from "./parser.js";

const BASE = "https://mfm.warhammer-community.com";
const UA = "Mozilla/5.0 (compatible; MFM-Portal/1.0; +local-reference)";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, ".cache");
export const CACHE_PATH = path.join(DATA_DIR, "mfm.json");

async function fetchText(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function scrapeAll({ onProgress } = {}) {
  const indexHtml = await fetchText(`${BASE}/en`);
  const index = parseIndex(indexHtml);
  const known = new Set(index.factions.map((f) => f.name.toLowerCase()));
  const factions = [];

  for (let i = 0; i < index.factions.length; i += 1) {
    const faction = index.factions[i];
    onProgress?.({ current: i + 1, total: index.factions.length, slug: faction.slug, name: faction.name });
    const html = await fetchText(`${BASE}/en/${faction.slug}`);
    const parsed = parseFaction(html, faction.slug, faction.name, known);
    factions.push({
      ...parsed,
      image: faction.image ? `${BASE}${faction.image.startsWith("/") ? faction.image : `/${faction.image}`}` : null,
      source: `${BASE}/en/${faction.slug}`,
      unitCount: parsed.units.length,
      detachmentCount: parsed.detachments.length,
    });
    await sleep(120);
  }

  const payload = {
    source: `${BASE}/en`,
    version: index.version,
    scrapedAt: new Date().toISOString(),
    factionCount: factions.length,
    factions: factions.sort((a, b) => a.name.localeCompare(b.name)),
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = await scrapeAll({
    onProgress: ({ current, total, name }) => console.log(`[${current}/${total}] ${name}`),
  });
  console.log(`Guardado ${data.factionCount} ejércitos (MFM v${data.version}) → ${CACHE_PATH}`);
}
