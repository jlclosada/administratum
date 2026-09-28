import { getSessionUser, supabase } from '@/lib/supabase';
import type { CommunityList, CreateCommunityListDTO, UpdateCommunityListDTO } from '@/types';
import { getMyLikes, mapRow, mapRows } from './repository';

async function withMyLikes(lists: CommunityList[]): Promise<CommunityList[]> {
  const liked = await getMyLikes(
    'list',
    lists.map((l) => l.id),
  );
  return lists.map((l) => ({ ...l, likedByMe: liked.has(l.id) }));
}

export async function getCommunityLists(limit = 60): Promise<CommunityList[]> {
  const { data, error } = await supabase
    .from('community_lists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return withMyLikes(mapRows<CommunityList>(data));
}

export async function getCommunityListsByUser(userId: string): Promise<CommunityList[]> {
  const { data, error } = await supabase
    .from('community_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return withMyLikes(mapRows<CommunityList>(data));
}

/** Community lists of a faction, matching any of its names (ES or EN). */
export async function getCommunityListsByFaction(names: string[], limit = 12): Promise<CommunityList[]> {
  const terms = names.filter(Boolean).map((n) => `faction_name.ilike."%${n.replace(/["\\]/g, '')}%"`);
  if (terms.length === 0) return [];
  const { data, error } = await supabase
    .from('community_lists')
    .select('*')
    .or(terms.join(','))
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return mapRows<CommunityList>(data);
}

export async function getCommunityListById(id: string): Promise<CommunityList | null> {
  const { data, error } = await supabase.from('community_lists').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [list] = await withMyLikes([mapRow<CommunityList>(data)]);
  return list ?? null;
}

export async function createCommunityList(dto: CreateCommunityListDTO): Promise<CommunityList> {
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) throw new Error('No hay sesión activa.');
  const authorName =
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Anónimo';
  const { data, error } = await supabase
    .from('community_lists')
    .insert({
      user_id: user.id,
      author_name: authorName,
      title: dto.title,
      faction_name: dto.factionName,
      total_points: dto.totalPoints,
      description: dto.description,
      detachment_name: dto.detachmentName ?? null,
      list_data: dto.listData,
      result: dto.result ?? null,
      tournament_id: dto.tournamentId ?? null,
      tournament_name: dto.tournamentName ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...mapRow<CommunityList>(data), likedByMe: false };
}

export async function deleteCommunityList(id: string): Promise<void> {
  const { error } = await supabase.from('community_lists').delete().eq('id', id);
  if (error) throw error;
}

/** Only the author can update (enforced by RLS). */
export async function updateCommunityList(dto: UpdateCommunityListDTO): Promise<CommunityList> {
  const payload: Record<string, unknown> = {};
  if (dto.title !== undefined) payload.title = dto.title;
  if (dto.factionName !== undefined) payload.faction_name = dto.factionName;
  if (dto.totalPoints !== undefined) payload.total_points = dto.totalPoints;
  if (dto.description !== undefined) payload.description = dto.description;
  if (dto.detachmentName !== undefined) payload.detachment_name = dto.detachmentName;
  if (dto.listData !== undefined) payload.list_data = dto.listData;
  if (dto.result !== undefined) payload.result = dto.result;
  if (dto.tournamentId !== undefined) payload.tournament_id = dto.tournamentId;
  if (dto.tournamentName !== undefined) payload.tournament_name = dto.tournamentName;
  const { data, error } = await supabase
    .from('community_lists')
    .update(payload)
    .eq('id', dto.id)
    .select()
    .single();
  if (error) throw error;
  const [list] = await withMyLikes([mapRow<CommunityList>(data)]);
  return list!;
}
