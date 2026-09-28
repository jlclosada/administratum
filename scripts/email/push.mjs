// Uploads every auth email template (subject + HTML) to the Supabase project
// and turns on the security notification emails, in one API call.
//
//   SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=abcd… npm run email:push
//
// Token: supabase.com/dashboard/account/tokens. Project ref: the id in the
// dashboard URL (supabase.com/dashboard/project/<ref>).
import { templates } from './templates.mjs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error('Faltan SUPABASE_ACCESS_TOKEN y/o SUPABASE_PROJECT_REF.');
  process.exit(1);
}

const body = {};
for (const t of templates) {
  body[`mailer_subjects_${t.api}`] = t.subject;
  body[`mailer_templates_${t.api}_content`] = t.html;
  if (t.notification) body[`mailer_notifications_${t.notification}_enabled`] = true;
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error(`Error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
console.log(`✓ ${templates.length} plantillas subidas a ${ref}:`);
for (const t of templates) console.log(`  · ${t.dashboard} — «${t.subject}»`);
