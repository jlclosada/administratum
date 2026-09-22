import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ASSETS_BASE = "https://assets.warhammer-community.com";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, ".cache");
export const CACHE_PATH = path.join(DATA_DIR, "downloads.json");

/**
 * Maps a game slug to its downloads-hub URL. The page renders every entry for
 * that game system client-side (no visible pagination for 40k as of writing),
 * fetched from a Next.js API route (`/api/search/downloads/`) backed by
 * Algolia. That route's request body isn't easily reproduced with a plain
 * HTTP client, so instead of guessing it we drive a real (headless) browser
 * and read the response it actually gets — robust to that internal API
 * changing shape, as long as the page still calls it and returns this shape.
 */
const GAME_PAGES = {
  "warhammer-40000": "https://www.warhammer-community.com/en-gb/downloads/warhammer-40000/",
};

/** "26/08/2026" (GW's DD/MM/YYYY) → "2026-08-26" (ISO date, or null). */
function toIsoDate(ddmmyyyy) {
  const m = String(ddmmyyyy || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function absoluteAsset(assetPath) {
  if (!assetPath) return null;
  return assetPath.startsWith("http") ? assetPath : `${ASSETS_BASE}/${assetPath}`;
}

function normalizeHit(hit) {
  const id = hit.id || {};
  const category = id.download_categories?.[0];
  const gameSystem = id.game_systems?.[0];
  return {
    gameName: gameSystem?.title || "Warhammer 40,000",
    slug: id.slug || hit.objectID,
    title: hit.title || id.title,
    category: category?.title || "Otros",
    fileUrl: absoluteAsset(id.file),
    fileSize: id.file_size || null,
    thumbnail: absoluteAsset(id.thumbnail?.path),
    topics: (id.topics || []).map((t) => t.title).filter(Boolean),
    sourceUpdatedAt: toIsoDate(id.last_updated) || toIsoDate(id.created_at),
    isNew: Boolean(id.new),
  };
}

/**
 * Loads a game's downloads page in a headless browser and collects every
 * `/api/search/downloads/` response it makes while the page settles.
 */
async function scrapeGame(browser, gameSlug, url, onProgress) {
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (compatible; Administratum-Portal/1.0; +local-reference)",
  });
  const hitsById = new Map();

  page.on("response", async (response) => {
    if (!response.url().includes("/api/search/downloads/")) return;
    if (response.status() !== 200) return;
    try {
      const json = await response.json();
      for (const hit of json.hits || []) {
        const entry = normalizeHit(hit);
        if (entry.slug && entry.fileUrl) hitsById.set(entry.slug, entry);
      }
    } catch {
      // Non-JSON or unrelated response with a matching URL substring — ignore.
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  // The page may lazily fire a couple more requests just after network-idle
  // (e.g. an accordion section opening itself); give it a short grace period.
  await page.waitForTimeout(1500);
  await page.close();

  const entries = [...hitsById.values()];
  onProgress?.({ gameSlug, count: entries.length });
  return entries;
}

export async function scrapeAll({ onProgress } = {}) {
  const browser = await chromium.launch();
  try {
    const byGame = {};
    for (const [gameSlug, url] of Object.entries(GAME_PAGES)) {
      byGame[gameSlug] = await scrapeGame(browser, gameSlug, url, onProgress);
    }

    const entries = Object.values(byGame).flat();
    const payload = {
      source: Object.values(GAME_PAGES),
      scrapedAt: new Date().toISOString(),
      entryCount: entries.length,
      entries: entries.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)),
    };

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(payload, null, 2), "utf8");
    return payload;
  } finally {
    await browser.close();
  }
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
    onProgress: ({ gameSlug, count }) => console.log(`[${gameSlug}] ${count} descargas`),
  });
  console.log(`Guardadas ${data.entryCount} descargas → ${CACHE_PATH}`);
}
