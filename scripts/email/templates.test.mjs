import { describe, expect, it } from 'vitest';
import { templates } from './templates.mjs';

const byApi = Object.fromEntries(templates.map((t) => [t.api, t]));

describe('auth email templates', () => {
  it('link emails go through /auth/confirmar with the right verifyOtp type', () => {
    const expected = {
      confirmation: 'type=email',
      recovery: 'type=recovery',
      email_change: 'type=email_change',
      magic_link: 'type=email&flow=magiclink',
      invite: 'type=invite',
    };
    for (const [api, type] of Object.entries(expected)) {
      expect(byApi[api].html).toContain(`{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&${type}`);
      expect(byApi[api].html).not.toContain('ConfirmationURL');
    }
  });

  it('reauthentication shows the code', () => {
    expect(byApi.reauthentication.html).toContain('{{ .Token }}');
  });

  it('notifications only use variables Supabase provides for them', () => {
    for (const api of ['password_changed_notification', 'email_changed_notification']) {
      const vars = [...byApi[api].html.matchAll(/\{\{\s*\.(\w+)/g)].map((m) => m[1]);
      expect(vars.every((v) => ['Email', 'OldEmail'].includes(v))).toBe(true);
    }
  });

  it('Go template actions are balanced', () => {
    for (const t of templates) {
      expect(t.html.split('{{').length).toBe(t.html.split('}}').length);
      const ifs = (t.html.match(/\{\{\s*if /g) ?? []).length;
      const ends = (t.html.match(/\{\{\s*end\s*\}\}/g) ?? []).length;
      expect(ifs).toBe(ends);
    }
  });
});
