import { describe, expect, it } from 'vitest';
import config from '../vercel.json';

describe('vercel.json', () => {
  it('redirects every administratum.vercel.app URL, including the root, to the domain', () => {
    const fromVercelApp = config.redirects.filter((r) =>
      r.has?.some((h) => h.type === 'host' && h.value === 'administratum.vercel.app'),
    );
    // "/:path*" alone doesn't match "/" on Vercel: the home page must have its own rule,
    // or it loads there while its scripts redirect to the domain (two copies of React).
    expect(fromVercelApp.map((r) => r.source)).toEqual(expect.arrayContaining(['/', '/:path+']));
    expect(fromVercelApp.every((r) => r.permanent && r.destination.startsWith('https://administratum.site/'))).toBe(true);
  });

  it('prerenders the home page: "/" goes to api/render and the SPA shell is app.html on Vercel', async () => {
    const pkg = (await import('../package.json')).default as { scripts: Record<string, string> };
    expect(config.rewrites[0]).toEqual({ source: '/', destination: '/api/render?path=/' });
    expect(config.rewrites.at(-1)?.destination).toBe('/app.html');
    expect(config.rewrites.some((r) => r.source === '/catalogo-puntos/:slug/:unit')).toBe(true);
    expect(pkg.scripts.build).toContain('scripts/vercel-postbuild.mjs');
  });
});
