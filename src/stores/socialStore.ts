import { getMyFriendships, getUnreadCount, subscribeToMessages } from '@/db';
import type { Message } from '@/types';
import { create } from 'zustand';

type Listener = (message: Message) => void;

interface SocialState {
  unread: number;
  incomingRequests: number;
  /** Chat currently open on screen; its messages don't count as unread. */
  activeChatId: string | null;
  start: (userId: string) => void;
  stop: () => void;
  refresh: () => Promise<void>;
  setActiveChat: (userId: string | null) => void;
  /** Subscribe to every new message involving the current user. */
  addListener: (listener: Listener) => () => void;
}

// One realtime channel for the whole app; pages listen through the store
// instead of opening their own subscriptions.
let unsubscribe: (() => void) | null = null;
let currentUserId: string | null = null;
const listeners = new Set<Listener>();

export const useSocialStore = create<SocialState>((set, get) => ({
  unread: 0,
  incomingRequests: 0,
  activeChatId: null,

  start: (userId) => {
    if (currentUserId === userId) return;
    get().stop();
    currentUserId = userId;
    unsubscribe = subscribeToMessages(userId, (message) => {
      const incoming = message.recipientId === userId;
      if (incoming && get().activeChatId !== message.senderId) {
        set((s) => ({ unread: s.unread + 1 }));
      }
      listeners.forEach((l) => l(message));
    });
    get().refresh();
  },

  stop: () => {
    unsubscribe?.();
    unsubscribe = null;
    currentUserId = null;
    set({ unread: 0, incomingRequests: 0, activeChatId: null });
  },

  refresh: async () => {
    if (!currentUserId) return;
    const [unread, friendships] = await Promise.all([getUnreadCount(), getMyFriendships()]);
    set({
      unread,
      incomingRequests: friendships.filter((f) => f.friendship.status === 'pending' && !f.outgoing).length,
    });
  },

  setActiveChat: (userId) => set({ activeChatId: userId }),

  addListener: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
}));
