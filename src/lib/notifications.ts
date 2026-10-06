import type { AppNotification } from '@/types';

const TARGET_NOUN: Record<NonNullable<AppNotification['targetType']>, string> = {
  photo: 'tu foto',
  list: 'tu lista',
  guide: 'tu guía',
  article: 'tu artículo',
  team: 'tu equipo',
  match: 'tu partida',
};

/** Sentence after the actor's name, e.g. "ha comentado en tu foto". */
export function notificationText(n: AppNotification): string {
  const noun = n.targetType ? TARGET_NOUN[n.targetType] : 'tu publicación';
  switch (n.type) {
    case 'friend_request':
      return 'te ha enviado una solicitud de amistad';
    case 'friend_accepted':
      return 'ha aceptado tu solicitud de amistad';
    case 'like':
      return `ha dado me gusta a ${noun}`;
    case 'comment':
      return `ha comentado en ${noun}`;
    case 'comment_like':
      return 'ha dado me gusta a tu comentario';
    case 'team_invite':
      return `te ha invitado a unirte al equipo ${n.excerpt}`;
    case 'team_joined':
      return `se ha unido al equipo ${n.excerpt}`;
    case 'match_joined':
      return `se ha apuntado a tu partida del ${n.excerpt}`;
    case 'match_left':
      return `ha abandonado tu partida del ${n.excerpt}`;
    case 'match_cancelled':
      return `ha cancelado la partida del ${n.excerpt}`;
    case 'match_invite':
      return `te ha invitado a una partida el ${n.excerpt}`;
  }
}

/** Where tapping the notification takes the user. */
export function notificationLink(n: AppNotification): string {
  switch (n.type) {
    case 'friend_request':
      return '/amigos';
    case 'friend_accepted':
      return n.actorId ? `/perfil/${n.actorId}` : '/amigos';
    case 'team_invite':
      return '/equipos';
    case 'team_joined':
      return n.targetId ? `/equipos/${n.targetId}` : '/equipos';
    case 'match_joined':
    case 'match_left':
    case 'match_cancelled':
    case 'match_invite':
      return n.targetId ? `/partidas/${n.targetId}` : '/partidas';
  }
  if (!n.targetId) return '/comunidad';
  switch (n.targetType) {
    case 'photo':
      return `/comunidad?foto=${n.targetId}`;
    case 'list':
      return `/comunidad/listas/${n.targetId}`;
    case 'guide':
      return `/guias/${n.targetId}`;
    case 'article':
      return `/articulos/${n.targetId}`;
    default:
      return '/comunidad';
  }
}

/** Compact relative time: "ahora", "5 min", "3 h", "2 d", then a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
