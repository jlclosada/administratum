import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

// No VITE_SENTRY_DSN is set in the test env (see vite.config.ts), so every
// call here should no-op instead of touching the (mocked) Sentry SDK.
describe('sentry helpers without VITE_SENTRY_DSN configured', () => {
  it('initSentry, reportError and setSentryUser do not throw and do not call the SDK', async () => {
    const Sentry = await import('@sentry/react');
    const { initSentry, reportError, setSentryUser } = await import('./sentry');

    expect(() => initSentry()).not.toThrow();
    expect(() => reportError(new Error('boom'))).not.toThrow();
    expect(() => setSentryUser({ id: 'u1', email: 'a@b.com' })).not.toThrow();

    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });
});
