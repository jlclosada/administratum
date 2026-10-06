import { describe, expect, it } from 'vitest';
import {
  campaignKey,
  defaultSubject,
  renderEmail,
  renderMatchInvite,
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

  it('announces a news article with its cover, excerpt and link', () => {
    const article = { id: 'a9', title: 'Nuevo dataslate de otoño', excerpt: 'Todos los cambios', cover_image: 'https://example.com/c.jpg' };
    const o = { template: 'noticia' as TemplateKey, article };
    const { subject, html } = renderEmail(o, me, digest);
    expect(subject).toBe('Nueva noticia: Nuevo dataslate de otoño');
    expect(html).toContain('https://administratum.site/articulos/a9');
    expect(html).toContain('https://example.com/c.jpg');
    expect(html).toContain('Todos los cambios');
    expect(html).toContain('/articulos/a1'); // other recent news
    expect(campaignKey(o)).not.toBe(campaignKey({ ...o, article: { ...article, id: 'a10' } }));
  });

  it('invites to a game: link with token for strangers, plain link for users', () => {
    const match = {
      id: 'm1', starts_on: '2026-10-10', time_mode: 'fixed', start_time: '18:00:00', venue_type: 'tienda',
      venue_name: 'Dungeon Marvels', city: 'Madrid', format: 'equilibrado', points_limit: 2000, level: 'casual', host_faction: 'Thousand Sons',
      description: 'Traigo la <mesa>',
    };
    const ext = renderMatchInvite({ token: 'tok123', email: 'amigo@club.es', name: '', external: true, hostName: 'José <b>', match });
    expect(ext.subject).toBe('José <b> te ha invitado a una partida de Warhammer 40K');
    expect(ext.html).toContain('/partidas/m1?invitacion=tok123');
    expect(ext.html).toContain('José &lt;b&gt;');
    expect(ext.html).not.toContain('José <b>');
    expect(ext.html).toContain('Dungeon Marvels · Madrid');
    expect(ext.html).toContain('a las 18:00');
    expect(ext.html).toContain('Traigo la &lt;mesa&gt;');
    expect(ext.html).toContain('action=unsubscribe&e=amigo%40club.es');
    const user = renderMatchInvite({ token: 'tok123', email: 'u@x.es', name: 'Laura', external: false, hostName: 'José', match: { ...match, venue_type: 'casa', venue_name: 'Calle Falsa 1' } });
    expect(user.html).toContain('Hola, Laura.');
    expect(user.html).toContain('href="https://administratum.site/partidas/m1"');
    expect(user.html).not.toContain('invitacion=');
    expect(user.html).toContain('En casa · Madrid');
    expect(user.html).not.toContain('Calle Falsa');
    expect(user.html).not.toContain('action=unsubscribe');
  });
});

