// Writes every auth email template to supabase/templates/<name>.html.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { templates } from './templates.mjs';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../supabase/templates');
mkdirSync(outDir, { recursive: true });

for (const t of templates) {
  writeFileSync(join(outDir, `${t.api}.html`), t.html);
  console.log(`✓ ${t.api}.html  —  ${t.dashboard}  —  «${t.subject}»`);
}
