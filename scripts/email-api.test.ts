import { describe, expect, it } from 'vitest';
import {
  campaignKey,
  defaultSubject,
  renderEmail,
  signEmail,
  signUser,
  verifyEmail,
  verifyUser,
  type Digest,
  type TemplateKey,
} from '../api/email';

const digest: Digest = {
  articles: [{ id: 'a1', title: 'Nuevo dataslate', excerpt: 'Cambios importantes' }],
  points: [{ title: 'Rubric Marines', description: 'Mil Hijos', points_delta: 10, points_after: 110, link: '/catalogo-puntos/thousand-sons' }],
  tournaments: [{ id: 't1', name: 'GT Talavera', location: 'Talavera', start_date: '2026-10-30', max_players: 32, attendee_count: 24 }],
  lists: [{ id: 'l1', title: 'Grand Coven', faction_name: 'Mil Hijos', total_points: 2000, author_name: 'Laura' }],
  photos: [{ id: 'p1', title: 'Magnus', image: 'https://example.com/m.jpg', author_name: 'Laura' }],
};
const me = { id: '11111111-1111-4111-8111-111111111111', email: 'jose@example.com', name: 'José' };

describe('email api', () => {
  it('renders every template with greeting, content and unsubscribe link', () => {
    for (const template of ['presentacion', 'destacado', 'novedades', 'recordatorio'] as TemplateKey[]) {
      const { subject, html } = renderEmail({ template, feature: 'torneos' }, me, digest);
      expect(subject).toBe(defaultSubject({ template, feature: 'torneos' }));
      expect(html).toContain('Hola, José.');
      expect(html).toContain(`/api/email?action=unsubscribe&u=${me.id}&t=`);
    }
    const reminder = renderEmail({ template: 'recordatorio' }, me, digest).html;
    expect(reminder).toContain('GT Talavera');
    expect(reminder).toContain('Rubric Marines');
    expect(reminder).toContain('/comunidad/listas/l1');
  });

  it('uses a custom subject and escapes user content', () => {
    const { subject, html } = renderEmail(
      { template: 'novedades', subject: 'Asunto propio' },
      { ...me, name: '<b>Eve</b>' },
      digest,
    );
    expect(subject).toBe('Asunto propio');
    expect(html).toContain('Hola, &lt;b&gt;Eve&lt;/b&gt;.');
  });

  it('signs unsubscribe links and rejects forged ones', () => {
    const sig = signUser(me.id, 'secret');
    expect(verifyUser(me.id, sig, 'secret')).toBe(true);
    expect(verifyUser(me.id, sig, 'other')).toBe(false);
    expect(verifyUser('22222222-2222-4222-8222-222222222222', sig, 'secret')).toBe(false);
    expect(verifyUser(me.id, 'nope', 'secret')).toBe(false);
  });

  it('gives external contacts an address-signed unsubscribe link and a sign-up button', () => {
    const contact = { id: '', email: 'Amigo@Club.es', name: '', external: true };
    const { html } = renderEmail({ template: 'presentacion' }, contact, digest);
    expect(html).toContain('Hola.');
    expect(html).toContain('/api/email?action=unsubscribe&e=amigo%40club.es&t=');
    expect(html).not.toContain('&u=');
    expect(html).toContain('/?registro=1');
    expect(html).toContain('aceptaste recibir novedades');
    expect(html).not.toContain('tienes una cuenta');
  });

  it('signs contact addresses case-insensitively and rejects forged ones', () => {
    const sig = signEmail('amigo@club.es', 'secret');
    expect(verifyEmail('AMIGO@club.es', sig, 'secret')).toBe(true);
    expect(verifyEmail('otro@club.es', sig, 'secret')).toBe(false);
    expect(verifyEmail('amigo@club.es', sig, 'other')).toBe(false);
    // A user-id signature can't be replayed as an address signature.
    expect(verifyEmail('amigo@club.es', signUser('amigo@club.es', 'secret'), 'secret')).toBe(false);
  });

  it('keys campaigns by template, feature and subject', () => {
    const base = campaignKey({ template: 'presentacion' });
    expect(campaignKey({ template: 'presentacion', subject: defaultSubject({ template: 'presentacion' }) })).toBe(base);
    expect(campaignKey({ template: 'presentacion', subject: '  Otro asunto ' })).not.toBe(base);
    expect(campaignKey({ template: 'destacado', feature: 'puntos', subject: 'X' })).not.toBe(
      campaignKey({ template: 'destacado', feature: 'torneos', subject: 'X' }),
    );
  });
});
