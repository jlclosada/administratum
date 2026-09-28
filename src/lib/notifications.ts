import type { AppNotification } from '@/types';

const TARGET_NOUN: Record<NonNullable<AppNotification['targetType']>, string> = {
  photo: 'tu foto',
  list: 'tu lista',
  guide: 'tu guía',
  article: 'tu artículo',
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
  }
}

/** Where tapping the notification takes the user. */
export function notificationLink(n: AppNotification): string {
  switch (n.type) {
    case 'friend_request':
      return '/amigos';
    case 'friend_accepted':
      return n.actorId ? `/perfil/${n.actorId}` : '/amigos';
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
