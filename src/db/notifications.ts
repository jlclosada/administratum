import { supabase } from '@/lib/supabase';
import type { AppNotification, SharedPhoto } from '@/types';
import { mapRow, mapRows, withMyPhotoState } from './repository';

// ======================== NOTIFICATIONS ========================
// Rows are created by database triggers (friend requests, likes, comments);
// the client only reads them, marks them read and deletes them.

export async function getNotifications(limit = 40): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return mapRows<AppNotification>(data ?? []);
}

/** Marks the given notifications as read, or all of them when `ids` is omitted. */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read', { ids: ids ?? null });
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (n: AppNotification) => void,
): () => void {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload: { new: Record<string, unknown> }) => onNotification(mapRow<AppNotification>(payload.new)),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** A single shared photo, for opening one from a link (e.g. a notification). */
export async function getSharedPhotoById(id: string): Promise<SharedPhoto | null> {
  const { data, error } = await supabase.from('shared_photos').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [photo] = await withMyPhotoState([mapRow<SharedPhoto>(data)]);
  return photo ?? null;
}
