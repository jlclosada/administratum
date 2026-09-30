import { dedupeCatalog, flattenCatalog, flattenFactions, pricingDelta, sameJson } from './catalog.mjs';
import { scrapeAll } from './scrape.js';

/**
 * Brings unit_catalog / faction_catalog in line with the official Munitorum
 * Field Manual, re-prices the users' miniatures linked to a unit whose points
 * changed and logs each real change to catalog_updates ("Cambios de puntos").
 *
 * Shared by the daily GitHub Action (scripts/mfm/sync.mjs) and the admin
 * "Sincronizar ahora" button (api/mfm-sync.ts). `supabase` must use the
 * service role key.
 */

const UNIT_FIELDS =
  'id, game_name, faction_slug, faction_name, name, category, group_title, pricing, wargear, leader_to, support_to, legends, default_quantity, mfm_version';

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

/** True when any synced column differs (jsonb columns compared key-order-insensitively). */
export function rowChanged(existing, row) {
  return Object.keys(row).some((k) => !sameJson(existing[k], row[k]));
}

/** The catalog_updates entry for a unit whose points changed. */
export function updateEntry(existing, row) {
  const change = pricingDelta(existing.pricing, row.pricing);
  const sign = change && change.delta > 0 ? '+' : '';
  return {
    game_name: row.game_name,
    type: 'points',
    title: `${row.name} - ${row.faction_name}`,
    description: change
      ? `${sign}${change.delta} pts (${change.before} → ${change.after}${change.models ? `, ${change.models} ${change.models === 1 ? 'miniatura' : 'miniaturas'}` : ''})`
      : 'Cambio en las opciones de puntos',
    link: `/catalogo-puntos/${row.faction_slug}`,
    points_before: change?.before ?? null,
    points_after: change?.after ?? null,
    points_delta: change?.delta ?? null,
  };
}

/** Compares scraped rows against the stored ones. Pure, for tests. */
export function diffCatalog(existingRows, rows) {
  const byKey = new Map(existingRows.map((r) => [`${r.game_name}\0${r.faction_slug}\0${r.name}`, r]));
  const added = [];
  const repriced = [];
  const toUpsert = [];
  for (const row of rows) {
    const old = byKey.get(`${row.game_name}\0${row.faction_slug}\0${row.name}`);
    if (!old) {
      added.push(row);
      toUpsert.push(row);
    } else if (rowChanged(old, row)) {
      toUpsert.push(row);
      if (!sameJson(old.pricing, row.pricing)) repriced.push({ id: old.id, old, row });
    }
  }
  return { added, repriced, toUpsert };
}

async function fetchAll(supabase, table, fields) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(fields)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

async function upsertRows(supabase, table, onConflict, rows, log) {
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw error;
    log(`[${table}] ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
}

export async function syncMfm(supabase, { log = console.log, dryRun = false, scrape = scrapeAll } = {}) {
  const scraped = await scrape({
    onProgress: ({ current, total, name }) => log(`[${current}/${total}] ${name}`),
  });
  const units = dedupeCatalog(flattenCatalog(scraped));
  if (units.length < 500) {
    // A layout change on the MFM site would parse to (almost) nothing; never
    // let that wipe or corrupt the catalog.
    throw new Error(`Solo se han leído ${units.length} unidades del MFM; se cancela la sincronización.`);
  }
  const rows = units.map(toRow);
  const existing = await fetchAll(supabase, 'unit_catalog', UNIT_FIELDS);
  const { added, repriced, toUpsert } = diffCatalog(existing, rows);
  const updates = repriced.map(({ old, row }) => updateEntry(old, row));

  const summary = {
    version: scraped.version,
    units: rows.length,
    added: added.length,
    repriced: repriced.length,
    upserted: toUpsert.length,
    miniaturesUpdated: 0,
    changes: updates.slice(0, 50).map((u) => `${u.title}: ${u.description}`),
    dryRun,
  };
  log(
    `MFM v${summary.version}: ${summary.units} unidades · ${summary.repriced} con puntos nuevos · ${summary.added} nuevas · ${summary.upserted} filas a actualizar`,
  );
  if (dryRun) return summary;

  if (toUpsert.length) await upsertRows(supabase, 'unit_catalog', 'game_name,faction_slug,name', toUpsert, log);

  const factions = flattenFactions(scraped).map(toFactionRow);
  await upsertRows(supabase, 'faction_catalog', 'game_name,faction_slug', factions, log);

  for (const { id, row } of repriced) {
    const { data, error } = await supabase
      .from('miniatures')
      .update({ points_snapshot: row.pricing })
      .eq('catalog_unit_id', id)
      .select('id');
    if (error) throw error;
    summary.miniaturesUpdated += data?.length ?? 0;
  }

  if (updates.length) {
    const { error } = await supabase.from('catalog_updates').insert(updates);
    if (error) throw error;
  }
  log(`Miniaturas de usuarios actualizadas: ${summary.miniaturesUpdated}. Cambios registrados: ${updates.length}.`);
  return summary;
}
