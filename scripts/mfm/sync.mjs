import { createClient } from '@supabase/supabase-js';
import { syncMfm } from './syncCore.mjs';

// Daily GitHub Action (see .github/workflows/sync-mfm.yml).
// `--dry-run` only reads, so the anon key is enough to preview what would change.
const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (dryRun ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

if (!url || !key) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o VITE_SUPABASE_URL + service role).');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const summary = await syncMfm(supabase, { dryRun });
if (summary.changes.length) console.log(summary.changes.join('\n'));
