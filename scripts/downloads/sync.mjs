import { createClient } from '@supabase/supabase-js';
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

function toRow(entry) {
  return {
    game_name: entry.gameName,
    slug: entry.slug,
    title: entry.title,
    category: entry.category,
    file_url: entry.fileUrl,
    file_size: entry.fileSize,
    thumbnail: entry.thumbnail,
    topics: entry.topics,
    source_updated_at: entry.sourceUpdatedAt,
    is_new: entry.isNew,
  };
}

async function fetchExisting() {
  const { data, error } = await supabase
    .from('downloads_catalog')
    .select('game_name, slug, source_updated_at');
  if (error) throw error;
  return data ?? [];
}

async function upsertRows(rows) {
  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('downloads_catalog')
      .upsert(chunk, { onConflict: 'game_name,slug' });
    if (error) throw error;
    console.log(`Upsert ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }
}

async function logCatalogUpdates(rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from('catalog_updates').insert(rows);
  if (error) throw error;
  console.log(`[catalog_updates] ${rows.length} documentos nuevos/actualizados registrados.`);
}

const scraped = await scrapeAll({
  onProgress: ({ gameSlug, count }) => console.log(`[${gameSlug}] ${count} descargas encontradas`),
});
console.log(`Descargas: ${scraped.entryCount} archivos`);

const existing = await fetchExisting();
const existingByKey = new Map(
  existing.map((r) => [`${r.game_name}\0${r.slug}`, r]),
);

// On a from-scratch sync (empty table) every entry is technically "new" —
// skip logging so the very first run doesn't flood the feed with the whole
// catalog, mirroring how the MFM sync only logs pricing *changes*, never
// the initial population.
const isFirstSync = existing.length === 0;

const updates = [];
for (const entry of scraped.entries) {
  if (isFirstSync) break;
  const key = `${entry.gameName}\0${entry.slug}`;
  const old = existingByKey.get(key);
  if (!old) {
    updates.push({
      game_name: entry.gameName,
      type: 'download',
      title: entry.title,
      description: `${entry.category} · documento nuevo`,
      link: '/descargas',
    });
  } else if (entry.sourceUpdatedAt && entry.sourceUpdatedAt !== old.source_updated_at) {
    updates.push({
      game_name: entry.gameName,
      type: 'download',
      title: entry.title,
      description: `${entry.category} · documento actualizado`,
      link: '/descargas',
    });
  }
}

await upsertRows(scraped.entries.map(toRow));
await logCatalogUpdates(updates);
console.log('Sincronización completada.');
