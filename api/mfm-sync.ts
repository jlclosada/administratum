/**
 * POST /api/mfm-sync — "Sincronizar ahora" in Admin → Catálogo: reads the
 * official Munitorum Field Manual and updates points right away (the daily
 * GitHub Action runs the same code). Admins only.
 */
import { createClient } from '@supabase/supabase-js';
// Plain ESM shared with the GitHub Action; types in syncCore.d.mts.
import { syncMfm } from '../scripts/mfm/syncCore.mjs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function isAdmin(req: Request): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok && (await res.json()) === true;
}

export async function POST(req: Request): Promise<Response> {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel.' }, 500);
  if (!(await isAdmin(req))) return json({ error: 'Solo administradores' }, 403);
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const summary = await syncMfm(supabase, { log: () => {} });
    // Points moved: email everyone now (api/email.ts, same CRON_SECRET).
    let emailed: unknown = null;
    if (summary.repriced > 0 && process.env.CRON_SECRET) {
      emailed = await fetch(`${new URL(req.url).origin}/api/email?action=points`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      })
        .then((r) => r.json())
        .catch(() => null);
    }
    return json({ ...summary, emailed });
  } catch (err) {
    return json({ error: (err as Error).message || 'No se pudo sincronizar' }, 500);
  }
}
