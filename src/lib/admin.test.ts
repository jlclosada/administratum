import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAdminEmail } from './admin';

describe('isAdminEmail', () => {
  it('fails closed when no admin email is configured (VITE_ADMIN_EMAIL unset)', () => {
    // No .env in this test environment, so ADMIN_EMAIL is '' — nobody should
    // ever be treated as admin in that state, not even an empty-string match.
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail('someone@example.com')).toBe(false);
  });
});

describe('isAdminEmail with VITE_ADMIN_EMAIL configured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('matches case-insensitively and ignores surrounding whitespace', async () => {
    vi.stubEnv('VITE_ADMIN_EMAIL', 'Admin@Example.com');
    vi.resetModules();
    const { isAdminEmail: isAdminEmailConfigured } = await import('./admin');

    expect(isAdminEmailConfigured('admin@example.com')).toBe(true);
    expect(isAdminEmailConfigured('  Admin@Example.com  ')).toBe(true);
    expect(isAdminEmailConfigured('ADMIN@EXAMPLE.COM')).toBe(true);
    expect(isAdminEmailConfigured('someone-else@example.com')).toBe(false);
  });
});
