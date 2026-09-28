import { supabase } from '@/lib/supabase';
import type { CommunityList, CreateCommunityListDTO } from '@/types';
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

export async function getCommunityListById(id: string): Promise<CommunityList | null> {
  const { data, error } = await supabase.from('community_lists').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const [list] = await withMyLikes([mapRow<CommunityList>(data)]);
  return list ?? null;
}

export async function createCommunityList(dto: CreateCommunityListDTO): Promise<CommunityList> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
