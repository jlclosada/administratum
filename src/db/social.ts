import { supabase } from '@/lib/supabase';
import type {
  Conversation,
  FriendEntry,
  Friendship,
  Message,
  Profile,
  ProfileStats,
  SharedPhoto,
} from '@/types';
import { mapRow, mapRows, toProfile, withMyPhotoState } from './repository';

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user.id;
}

// ======================== PROFILES (lookup) ========================

export async function getProfilesByIds(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error || !data) return new Map();
  return new Map(data.map((row) => {
    const p = toProfile(row);
    return [p.id, p];
  }));
}

export async function searchProfiles(term: string, limit = 12): Promise<Profile[]> {
  const q = term.trim().replace(/[%,]/g, ' ');
  if (!q) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', `%${q}%`)
    .limit(limit);
  if (error || !data) return [];
  return data.map(toProfile);
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const { data, error } = await supabase.rpc('profile_stats', { uid: userId });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { friends: 0, photos: 0, guides: 0 };
  return { friends: row.friends ?? 0, photos: row.photos ?? 0, guides: row.guides ?? 0 };
}

export async function getSharedPhotosByUser(userId: string): Promise<SharedPhoto[]> {
  const { data, error } = await supabase
    .from('shared_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return withMyPhotoState(mapRows<SharedPhoto>(data));
}

// ======================== FRIENDSHIPS ========================

export async function getMyFriendships(): Promise<FriendEntry[]> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  const friendships = mapRows<Friendship>(data);
  const others = await getProfilesByIds(
    friendships.map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId)),
  );
  return friendships.flatMap((f) => {
    const otherId = f.requesterId === me ? f.addresseeId : f.requesterId;
    const other = others.get(otherId);
    return other ? [{ friendship: f, other, outgoing: f.requesterId === me }] : [];
  });
}

/** The friendship row between the current user and `userId`, if any. */
export async function getFriendshipWith(userId: string): Promise<Friendship | null> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`,
    )
    .maybeSingle();
  if (error || !data) return null;
  return mapRow<Friendship>(data);
}

export async function sendFriendRequest(userId: string): Promise<Friendship> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ addressee_id: userId })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Friendship>(data);
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_friend_request', { request_id: friendshipId });
  if (error) throw error;
}

/** Declines a request, cancels an outgoing one, or unfriends. */
export async function removeFriendship(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

// ======================== MESSAGES ========================

export async function getMessagesWith(userId: string, limit = 200): Promise<Message[]> {
  const me = await requireUserId();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${me})`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return mapRows<Message>(data).reverse();
}

export async function sendMessage(recipientId: string, content: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ recipient_id: recipientId, content })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Message>(data);
}

export async function markConversationRead(userId: string): Promise<void> {
  await supabase.rpc('mark_conversation_read', { other: userId });
}

export async function getUnreadCount(): Promise<number> {
  const me = await requireUserId();
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', me)
    .is('read_at', null);
  if (error) return 0;
  return count ?? 0;
}

/**
 * One entry per accepted friend, with the latest message and unread count.
 * Built client-side from the user's recent messages — fine at this scale.
 */
export async function getConversations(): Promise<Conversation[]> {
  const me = await requireUserId();
  const friends = (await getMyFriendships()).filter((f) => f.friendship.status === 'accepted');
  const { data } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  const messages = mapRows<Message>(data ?? []);

  const conversations = friends.map(({ other }) => {
    const thread = messages.filter((m) => m.senderId === other.id || m.recipientId === other.id);
    return {
      other,
      lastMessage: thread[0] ?? null,
      unread: thread.filter((m) => m.recipientId === me && !m.readAt).length,
    };
  });
  return conversations.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Live stream of new messages involving the current user. RLS on the
 * `messages` table limits realtime events to the two participants.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(userId: string, onMessage: (m: Message) => void): () => void {
  const handle = (payload: { new: Record<string, unknown> }) => onMessage(mapRow<Message>(payload.new));
  const channel = supabase
    .channel(`messages:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` },
      handle,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` },
      handle,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
