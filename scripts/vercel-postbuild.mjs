// Runs after `vite build`, on Vercel only (the Tauri desktop build needs
// dist/index.html). Vercel serves files before applying rewrites, so while
// dist/index.html exists "/" never reaches api/render and Google gets an
// empty shell for the home page. Renamed, "/" falls through to the
// prerender rewrite and every SPA route to /app.html (see vercel.json).
import { rename } from 'node:fs/promises';

if (process.env.VERCEL) {
  await rename('dist/index.html', 'dist/app.html');
  console.log('dist/index.html → dist/app.html (prerendered home on Vercel)');
}
