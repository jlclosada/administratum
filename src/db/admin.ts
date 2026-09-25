import { supabase } from '@/lib/supabase';
import type { Ad, AdminUser, CreateAdDTO, UserRole } from '@/types';
import { mapRow, mapRows } from './repository';

// ======================== USERS (admin directory) ========================

export async function adminListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return mapRows<AdminUser>(data ?? []).map((u) => ({
    ...u,
    role: u.role === 'admin' ? 'admin' : 'user',
  }));
}

export async function adminSetRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('admin_set_role', { target: userId, new_role: role });
  if (error) throw error;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { target: userId });
  if (error) throw error;
}

// ======================== ADS ========================

export async function getAds(activeOnly = true): Promise<Ad[]> {
  try {
    let q = supabase.from('ads').select('*').order('sort_order', { ascending: true });
    if (activeOnly) q = q.eq('active', true);
    const { data, error } = await q;
    if (error || !data) return [];
    return mapRows<Ad>(data);
  } catch {
    return [];
  }
}

export async function createAd(dto: CreateAdDTO): Promise<Ad> {
  const { data, error } = await supabase
    .from('ads')
    .insert({
      title: dto.title ?? '',
      image: dto.image,
      url: dto.url,
      position: dto.position,
      sort_order: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Ad>(data);
}

export async function updateAd(id: string, patch: Partial<CreateAdDTO>): Promise<Ad> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.image !== undefined) payload.image = patch.image;
  if (patch.url !== undefined) payload.url = patch.url;
  if (patch.position !== undefined) payload.position = patch.position;
  if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;
  if (patch.active !== undefined) payload.active = patch.active;
  const { data, error } = await supabase.from('ads').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapRow<Ad>(data);
}

export async function deleteAd(id: string): Promise<void> {
  const { error } = await supabase.from('ads').delete().eq('id', id);
  if (error) throw error;
}
