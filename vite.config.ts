import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    // happy-dom, not jsdom: several of jsdom's own transitive deps
    // (parse5 8.x, @exodus/bytes, @asamuzakjp/css-color) currently ship
    // ESM-only builds that jsdom's CJS require() calls can't load.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    env: {
      // Dummy values so modules that construct the Supabase client at import
      // time (src/lib/supabase.ts) don't throw during tests — no network
      // call happens until a request is actually made.
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
