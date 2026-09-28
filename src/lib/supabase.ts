import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
      'Cópialas desde tu proyecto de Supabase a un archivo .env.local (ver .env.example).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Storage bucket used for all user media (miniature images, covers, process media, PDFs). */
export const STORAGE_BUCKET = 'media';

/**
 * The signed-in user, read from the local session (refreshed first if the
 * access token has expired). Unlike `auth.getUser()` it needs no extra network
 * round trip, so it doesn't report "no session" on a flaky mobile connection or
 * right after the app comes back from the background. Every query is still
 * checked server-side by RLS. Same return shape as `auth.getUser()`.
 */
export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return { data: { user: data.session?.user ?? null } };
}
