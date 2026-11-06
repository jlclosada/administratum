import type { FriendlyGame, GameStatus } from '@/lib/play/types';
import { getSessionUser, supabase } from '@/lib/supabase';
import { mapRow, mapRows } from './repository';

// Friendly games: one-off games scored with the tracker (friendly_games).

export type FriendlyGameDTO = Pick<FriendlyGame, 'playerB' | 'nameA' | 'nameB' | 'factionA' | 'factionB' | 'listA' | 'listB' | 'pointsLimit' | 'matchId' | 'playedOn'>;

const snake = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]));

export async function getMyFriendlyGames(): Promise<FriendlyGame[]> {
  const { data: auth } = await getSessionUser();
  if (!auth.user) return [];
  const uid = auth.user.id;
  const { data, error } = await supabase
    .from('friendly_games')
    .select('*')
    .or(`player_a.eq.${uid},player_b.eq.${uid}`)
    .order('played_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return [];
  return mapRows<FriendlyGame>(data ?? []);
}

export async function getFriendlyGame(id: string): Promise<FriendlyGame | null> {
  const { data, error } = await supabase.from('friendly_games').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow<FriendlyGame>(data);
}

export async function createFriendlyGame(dto: FriendlyGameDTO): Promise<FriendlyGame> {
  const { data: auth } = await getSessionUser();
  if (!auth.user) throw new Error('Inicia sesión para crear una partida.');
  const { data, error } = await supabase
    .from('friendly_games')
    .insert({ ...snake({ ...dto }), created_by: auth.user.id, player_a: auth.user.id })
    .select('*')
    .single();
  if (error) throw error;
  return mapRow<FriendlyGame>(data);
}

export async function updateFriendlyGame(id: string, patch: Partial<Pick<FriendlyGame, 'setup' | 'rounds' | 'vpA' | 'vpB' | 'status'>>): Promise<void> {
  const { error } = await supabase.from('friendly_games').update(snake({ ...patch })).eq('id', id);
  if (error) throw error;
}

export async function deleteFriendlyGame(id: string): Promise<void> {
  const { error } = await supabase.from('friendly_games').delete().eq('id', id);
  if (error) throw error;
}

export async function confirmFriendlyGame(id: string): Promise<GameStatus> {
  const { data, error } = await supabase.rpc('friendly_confirm', { p_game: id });
  if (error) throw error;
  return data as GameStatus;
}

export function subscribeToFriendlyGame(id: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`friendly:${id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendly_games', filter: `id=eq.${id}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
