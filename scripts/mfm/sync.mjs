import { createClient } from '@supabase/supabase-js';
import { flattenCatalog, dedupeCatalog, catalogKey, flattenFactions } from './catalog.mjs';
import { scrapeAll } from './scrape.js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o VITE_SUPABASE_URL + service role).',
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function fetchExisting() {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('unit_catalog')
      .select('id, game_name, faction_slug, name, pricing')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

function toRow(unit) {
  return {
    game_name: unit.gameName,
    faction_slug: unit.factionSlug,
    faction_name: unit.factionName,
    name: unit.name,
    category: unit.category,
    group_title: unit.groupTitle,
    pricing: unit.pricing,
    wargear: unit.wargear,
    leader_to: unit.leaderTo,
    support_to: unit.supportTo,
    legends: unit.legends,
    default_quantity: unit.defaultQuantity,
    mfm_version: unit.mfmVersion,
  };
}

function pricingChanged(a, b) {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

async function upsertRows(table, onConflict, rows) {
  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
    console.log(`[${table}] Upsert ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
}

function toFactionRow(faction) {
  return {
    game_name: faction.gameName,
    faction_slug: faction.factionSlug,
    faction_name: faction.factionName,
    image: faction.image,
    parent_faction: faction.parentFaction,
    detachments: faction.detachments,
    mfm_version: faction.mfmVersion,
  };
}

async function updateMiniatures(changed) {
  let updated = 0;
  for (const unit of changed) {
    const { data, error } = await supabase
      .from('miniatures')
      .update({ points_snapshot: unit.pricing })
      .eq('catalog_unit_id', unit.id)
      .select('id');
    if (error) throw error;
    updated += data?.length ?? 0;
  }
  return updated;
}

const scraped = await scrapeAll({
  onProgress: ({ current, total, name }) => console.log(`[${current}/${total}] ${name}`),
});
const units = dedupeCatalog(flattenCatalog(scraped));
console.log(`Catálogo: ${units.length} unidades (MFM v${scraped.version})`);

const existing = await fetchExisting();
const existingByKey = new Map(
  existing.map((r) => [`${r.game_name}\0${r.faction_slug}\0${r.name}`, r]),
);

const changedKeys = [];
for (const unit of units) {
  const old = existingByKey.get(catalogKey(unit));
  if (old && pricingChanged(old.pricing, unit.pricing)) {
    changedKeys.push({ ...old, pricing: unit.pricing, name: unit.name });
  }
}

await upsertRows('unit_catalog', 'game_name,faction_slug,name', units.map(toRow));

const factions = flattenFactions(scraped);
await upsertRows('faction_catalog', 'game_name,faction_slug', factions.map(toFactionRow));
console.log(
  `Facciones: ${factions.length} (${factions.reduce((n, f) => n + f.detachments.length, 0)} destacamentos)`,
);

const miniaturesUpdated = await updateMiniatures(changedKeys);
console.log(
  `Puntos actualizados: ${changedKeys.length} fichas del catálogo, ${miniaturesUpdated} miniaturas de usuarios.`,
);
