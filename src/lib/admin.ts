import { useAuthStore } from '@/stores';

/**
 * Email of the site owner / administrator.
 * Configure it via the `VITE_ADMIN_EMAIL` environment variable.
 * Must match the email used in the `app_config` RLS policy in schema.sql.
 */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '')
  .toLowerCase()
  .trim();

/** Whether the given email is the configured admin. */
export function isAdminEmail(email?: string | null): boolean {
  if (!ADMIN_EMAIL || !email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

/** React hook: true when the current signed-in user is the admin. */
export function useIsAdmin(): boolean {
  const user = useAuthStore((s) => s.user);
  return isAdminEmail(user?.email);
}
