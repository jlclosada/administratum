/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_SENTRY_DSN?: string;
  /** Google Analytics 4 (G-XXXX). Optional: only loaded after cookie consent. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Meta (Facebook/Instagram) pixel id. Optional: only loaded after cookie consent. */
  readonly VITE_META_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected at build time from package.json's version (see vite.config.ts). */
declare const __APP_VERSION__: string;
