import { useAuthStore, useProfileStore } from '@/stores';

/**
 * Email of the superadmin (site owner), who can never be demoted or deleted.
 * Configure it via the `VITE_ADMIN_EMAIL` environment variable.
 * Must match `public.superadmin_email()` in schema.sql.
 */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '')
  .toLowerCase()
  .trim();

/** Whether the given email is the superadmin's. */
export function isAdminEmail(email?: string | null): boolean {
  if (!ADMIN_EMAIL || !email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL;
}

/** React hook: true for the superadmin only. */
export function useIsSuperadmin(): boolean {
  const user = useAuthStore((s) => s.user);
  return isAdminEmail(user?.email);
}

/**
 * React hook: true for the superadmin and for users promoted to admin.
 * This only gates UI — the database enforces the same rule via is_admin().
 */
export function useIsAdmin(): boolean {
  const isSuperadmin = useIsSuperadmin();
  const role = useProfileStore((s) => s.profile?.role);
  return isSuperadmin || role === 'admin';
}
