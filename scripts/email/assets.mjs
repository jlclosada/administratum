// Builds the images the email templates load from administratum.site/email/:
// a blurred, darkened hero backdrop, the logo and the emblem. Email clients
// can't blur or filter images with CSS, so the effect is baked in here.
//
//   node scripts/email/assets.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = join(root, 'public/email');
mkdirSync(out, { recursive: true });

// Hero: 2× of the 600×320 slot. Blur, darken, warm it towards the logo's
// bone/gold and add a vignette so white text and the logo stay legible.
const W = 1200, H = 640;
const vignette = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="45%">
      <stop offset="0%" stop-color="#d8c08a" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#d8c08a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="v" cx="50%" cy="42%" r="78%">
      <stop offset="0%" stop-color="#0a0a0b" stop-opacity="0"/>
      <stop offset="65%" stop-color="#0a0a0b" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#0a0a0b" stop-opacity="0.9"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="60%" stop-color="#0a0a0b" stop-opacity="0"/>
      <stop offset="100%" stop-color="#111113" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="url(#v)"/>
  <rect width="100%" height="100%" fill="url(#b)"/>
</svg>`);
await sharp(join(root, 'public/images/landing-hero.jpg'))
  .extract({ left: 0, top: 120, width: 1920, height: 1024 })
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .blur(7)
  .modulate({ brightness: 1.05, saturation: 0.5 })
  .linear(1.25, -18)
  .composite([{ input: vignette }])
  .jpeg({ quality: 78, progressive: true, mozjpeg: true })
  .toFile(join(out, 'hero.jpg'));

await sharp(join(root, 'public/images/logo.png')).resize({ width: 600 }).png({ compressionLevel: 9, effort: 10 }).toFile(join(out, 'logo.png'));
await sharp(join(root, 'public/images/loading-icon.png')).resize(128, 128).png({ compressionLevel: 9 }).toFile(join(out, 'emblem.png'));

for (const f of ['hero.jpg', 'logo.png', 'emblem.png']) {
  const m = await sharp(join(out, f)).metadata();
  console.log(`✓ public/email/${f}  ${m.width}×${m.height}`);
}
