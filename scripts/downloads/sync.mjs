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

const scraped = await scrapeAll({
  onProgress: ({ gameSlug, count }) => console.log(`[${gameSlug}] ${count} descargas encontradas`),
});
console.log(`Descargas: ${scraped.entryCount} archivos`);

await upsertRows(scraped.entries.map(toRow));
console.log('Sincronización completada.');
