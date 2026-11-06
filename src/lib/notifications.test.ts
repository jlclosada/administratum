import type { AppNotification } from '@/types';
import { describe, expect, it } from 'vitest';
import { notificationLink, notificationText, timeAgo } from './notifications';

const base: AppNotification = {
  id: 'n1',
  userId: 'me',
  actorId: 'actor',
  type: 'like',
  targetType: 'photo',
  targetId: 'p1',
  excerpt: '',
  readAt: null,
  createdAt: '2026-09-28T10:00:00Z',
};

describe('notifications', () => {
  it('links each kind to its content', () => {
    expect(notificationLink({ ...base, type: 'friend_request' })).toBe('/amigos');
    expect(notificationLink({ ...base, type: 'friend_accepted' })).toBe('/perfil/actor');
    expect(notificationLink(base)).toBe('/comunidad?foto=p1');
    expect(notificationLink({ ...base, type: 'comment', targetType: 'list', targetId: 'l1' })).toBe('/comunidad/listas/l1');
    expect(notificationLink({ ...base, type: 'comment_like', targetType: 'guide', targetId: 'g1' })).toBe('/guias/g1');
    expect(notificationLink({ ...base, targetType: 'article', targetId: 'a1' })).toBe('/articulos/a1');
  });

  it('takes tournament notifications to the match, the game or the tournament', () => {
    const t = { ...base, targetType: 'tournament' as const, targetId: 't1', entityId: 'x1', excerpt: '2 de Copa' };
    expect(notificationLink({ ...t, type: 'play_round' })).toBe('/torneos/t1/partidas/x1');
    expect(notificationLink({ ...t, type: 'play_confirm' })).toBe('/torneos/t1/juegos/x1');
    expect(notificationLink({ ...t, type: 'play_payment_ok' })).toBe('/torneos/t1');
    expect(notificationText({ ...t, type: 'play_round' })).toBe('ha publicado la ronda 2 de Copa: ya puedes ver tu enfrentamiento');
    expect(notificationLink({ ...t, type: 'play_league' })).toBe('/torneos/t1');
    expect(notificationLink({ ...base, type: 'friendly_game', targetType: 'friendly', targetId: 'g1' })).toBe('/competitivo/partida/g1');
    expect(notificationText({ ...base, type: 'friendly_game', excerpt: 'Orks vs Necrons' })).toBe('te ha añadido a una partida: Orks vs Necrons');
  });

  it('describes the action', () => {
    expect(notificationText({ ...base, type: 'friend_accepted' })).toBe('ha aceptado tu solicitud de amistad');
    expect(notificationText({ ...base, type: 'comment', targetType: 'list' })).toBe('ha comentado en tu lista');
    expect(notificationText(base)).toBe('ha dado me gusta a tu foto');
  });

  it('formats relative time', () => {
    const now = new Date('2026-09-28T12:00:00Z').getTime();
    expect(timeAgo('2026-09-28T11:59:30Z', now)).toBe('ahora');
    expect(timeAgo('2026-09-28T11:55:00Z', now)).toBe('5 min');
    expect(timeAgo('2026-09-28T09:00:00Z', now)).toBe('3 h');
    expect(timeAgo('2026-09-26T12:00:00Z', now)).toBe('2 d');
  });
});
