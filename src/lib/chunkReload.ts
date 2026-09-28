import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk-reload-at";
const LOOP_GUARD_MS = 10_000;

/**
 * After a deploy, tabs still running the previous build ask for hashed
 * chunks that no longer exist. Browsers word that failure differently.
 */
export function isChunkLoadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading chunk .* failed/i.test(
    message,
  );
}

/**
 * Reloads the page to pick up the new build — at most once every few
 * seconds, so a genuinely broken chunk can't cause a reload loop.
 * Returns whether a reload was triggered.
 */
export function reloadForNewVersion(storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage): boolean {
  try {
    const last = Number(storage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < LOOP_GUARD_MS) return false;
    storage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** React.lazy that recovers from stale-deploy chunk errors by reloading once. */
// Same constraint as React.lazy's own signature.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRoute<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(() =>
    loader().catch((err: unknown) => {
      if (isChunkLoadError(err) && reloadForNewVersion()) {
        // Keep Suspense's fallback on screen while the page reloads.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}
