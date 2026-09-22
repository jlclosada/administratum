import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

/**
 * Wires up error + performance monitoring. No-ops when VITE_SENTRY_DSN isn't
 * set (local dev by default), so nobody needs a Sentry account to run the app.
 */
export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `administratum@${__APP_VERSION__}`,
    integrations: [Sentry.browserTracingIntegration()],
    // Low sample rate: enough to catch real regressions without ballooning event volume.
    tracesSampleRate: 0.1,
  });
}

/** Report a caught error (e.g. from the app's ErrorBoundary) to Sentry, if configured. */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}

/** Attach the signed-in user to future events, or clear it on sign-out. */
export function setSentryUser(user: { id: string; email?: string | null } | null): void {
  if (!dsn) return;
  Sentry.setUser(user ? { id: user.id, email: user.email ?? undefined } : null);
}
