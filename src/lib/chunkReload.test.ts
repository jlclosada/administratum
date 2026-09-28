import { afterEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, reloadForNewVersion } from './chunkReload';

describe('isChunkLoadError', () => {
  it('recognizes the stale-chunk errors of each browser', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/HomePage-4JJ_JWV4.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
  });
  it('ignores unrelated errors', () => {
    expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadForNewVersion', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reloads once, then refuses again within the guard window', () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(reloadForNewVersion(storage)).toBe(true);
    expect(reloadForNewVersion(storage)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
