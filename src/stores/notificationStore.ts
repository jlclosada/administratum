import {
  deleteNotification,
  getNotifications,
  getProfilesByIds,
  markNotificationsRead,
  subscribeToNotifications,
} from '@/db';
import { notificationLink, notificationText } from '@/lib/notifications';
import type { AppNotification, Profile } from '@/types';
import { toast } from 'sonner';
import { create } from 'zustand';
import { useSocialStore } from './socialStore';

interface NotificationState {
  items: AppNotification[];
  actors: Map<string, Profile>;
  unread: number;
  loading: boolean;
  start: (userId: string, navigate: (to: string) => void) => void;
  stop: () => void;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

let unsubscribe: (() => void) | null = null;
let currentUserId: string | null = null;

const countUnread = (items: AppNotification[]) => items.filter((n) => !n.readAt).length;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  actors: new Map(),
  unread: 0,
  loading: false,

  start: (userId, navigate) => {
    if (currentUserId === userId) return;
    get().stop();
    currentUserId = userId;
    unsubscribe = subscribeToNotifications(userId, async (n) => {
      const actors = n.actorId && !get().actors.has(n.actorId) ? await getProfilesByIds([n.actorId]) : new Map();
      set((s) => {
        const items = [n, ...s.items.filter((x) => x.id !== n.id)];
        return { items, unread: countUnread(items), actors: new Map([...s.actors, ...actors]) };
      });
      // Friend badges live in the social store.
      if (n.type === 'friend_request' || n.type === 'friend_accepted') {
        useSocialStore.getState().refresh();
      }
      const name = (n.actorId && get().actors.get(n.actorId)?.displayName) || 'Alguien';
      toast(`${name} ${notificationText(n)}`, {
        description: n.excerpt || undefined,
        action: {
          label: 'Ver',
          onClick: () => {
            get().markRead(n.id);
            navigate(notificationLink(n));
          },
        },
      });
    });
    get().refresh();
  },

  stop: () => {
    unsubscribe?.();
    unsubscribe = null;
    currentUserId = null;
    set({ items: [], actors: new Map(), unread: 0 });
  },

  refresh: async () => {
    if (!currentUserId) return;
    set({ loading: true });
    try {
      const items = await getNotifications();
      const actors = await getProfilesByIds(items.map((n) => n.actorId ?? ''));
      set({ items, actors, unread: countUnread(items) });
    } catch {
      // Table missing (schema not yet applied) or offline: keep the bell empty.
    } finally {
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    if (get().unread === 0) return;
    const now = new Date().toISOString();
    set((s) => ({ items: s.items.map((n) => (n.readAt ? n : { ...n, readAt: now })), unread: 0 }));
    await markNotificationsRead().catch(() => get().refresh());
  },

  markRead: async (id) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.readAt) return;
    const now = new Date().toISOString();
    set((s) => {
      const items = s.items.map((n) => (n.id === id ? { ...n, readAt: now } : n));
      return { items, unread: countUnread(items) };
    });
    await markNotificationsRead([id]).catch(() => get().refresh());
  },

  remove: async (id) => {
    set((s) => {
      const items = s.items.filter((n) => n.id !== id);
      return { items, unread: countUnread(items) };
    });
    await deleteNotification(id).catch(() => get().refresh());
  },
}));
