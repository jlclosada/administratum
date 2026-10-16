// Security headers for every response (vercel.json → "headers"). Kept here
// so the CSP stays readable and a test checks vercel.json matches it.
// To add a third-party service, add its host to the right directive.
export const CSP = [
  "default-src 'self'",
  // Google tag and Meta pixel load only after cookie consent (src/lib/consent.ts).
  "script-src 'self' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // User photos (Supabase Storage), faction art, map tiles, Google avatars…
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://qqfggcpdphuadsicutsb.supabase.co wss://qqfggcpdphuadsicutsb.supabase.co https://*.ingest.de.sentry.io https://nominatim.openstreetmap.org https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com",
  "frame-src 'self' https://www.facebook.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];
