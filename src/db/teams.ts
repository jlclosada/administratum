import { getSessionUser, supabase } from '@/lib/supabase';
import type { ParsedArmyList } from '@/lib/armyListParser';
import type { ChatMessage, Team, TeamInvitation, TeamMember, TeamPost, TeamPostComment, TeamRole } from '@/types';
import { mapRow, mapRows } from './repository';

async function myId(): Promise<string> {
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user.id;
}

// ======================== TEAMS ========================

export interface TeamWithRole extends Team {
  myRole: TeamRole;
}

/** Teams the current user belongs to, with their role in each. */
export async function getMyTeams(): Promise<TeamWithRole[]> {
  const me = await myId();
  const { data: memberships, error } = await supabase.from('team_members').select('team_id, role').eq('user_id', me);
  if (error || !memberships?.length) return [];
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .in('id', memberships.map((m) => m.team_id))
    .order('updated_at', { ascending: false });
  const role = new Map(memberships.map((m) => [m.team_id as string, m.role as TeamRole]));
  return mapRows<Team>(teams ?? []).map((t) => ({ ...t, myRole: role.get(t.id) ?? 'member' }));
}

/** Public directory: every team, biggest first, optionally filtered by name or place. */
export async function searchTeams(term = '', limit = 30): Promise<Team[]> {
  let query = supabase.from('teams').select('*').order('member_count', { ascending: false }).limit(limit);
  const t = term.trim().replace(/[%,()]/g, '');
  if (t) query = query.or(`name.ilike.%${t}%,location.ilike.%${t}%`);
  const { data, error } = await query;
  if (error) return [];
  return mapRows<Team>(data ?? []);
}

export async function getTeam(id: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow<Team>(data);
}

export async function createTeam(dto: Pick<Team, 'name' | 'description' | 'location' | 'emblem' | 'banner'>): Promise<Team> {
  const { data, error } = await supabase.from('teams').insert(dto).select().single();
  if (error) throw error;
  return mapRow<Team>(data);
}

export async function updateTeam(id: string, dto: Partial<Pick<Team, 'name' | 'description' | 'location' | 'emblem' | 'banner'>>): Promise<Team> {
  const { data, error } = await supabase.from('teams').update(dto).eq('id', id).select().single();
  if (error) throw error;
  return mapRow<Team>(data);
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

// ======================== MEMBERS & INVITATIONS ========================

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase.from('team_members').select('*').eq('team_id', teamId).order('joined_at');
  if (error) return [];
  const order: Record<TeamRole, number> = { owner: 0, admin: 1, member: 2 };
  return mapRows<TeamMember>(data ?? []).sort((a, b) => order[a.role] - order[b.role]);
}

export async function leaveTeam(teamId: string): Promise<void> {
  const me = await myId();
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', me);
  if (error) throw error;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
  if (error) throw error;
}

/** Owner only: promote/demote an admin, or hand the team over ('owner'). */
export async function setTeamRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
  const { error } = await supabase.rpc('set_team_role', { p_team: teamId, p_user: userId, p_role: role });
  if (error) throw error;
}

/** Invitations sent to the current user, with the team they're for. */
export async function getMyTeamInvitations(): Promise<(TeamInvitation & { team: Team | null })[]> {
  const me = await myId();
  const { data, error } = await supabase.from('team_invitations').select('*').eq('user_id', me).order('created_at', { ascending: false });
  if (error || !data?.length) return [];
  const invitations = mapRows<TeamInvitation>(data);
  const { data: teams } = await supabase.from('teams').select('*').in('id', invitations.map((i) => i.teamId));
  const byId = new Map(mapRows<Team>(teams ?? []).map((t) => [t.id, t]));
  return invitations.map((i) => ({ ...i, team: byId.get(i.teamId) ?? null }));
}

/** Pending invitations of a team (managers only, by RLS). */
export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const { data, error } = await supabase.from('team_invitations').select('*').eq('team_id', teamId).order('created_at');
  if (error) return [];
  return mapRows<TeamInvitation>(data ?? []);
}

export async function inviteToTeam(teamId: string, userId: string): Promise<TeamInvitation> {
  const { data, error } = await supabase.from('team_invitations').insert({ team_id: teamId, user_id: userId }).select().single();
  if (error) throw error;
  return mapRow<TeamInvitation>(data);
}

/** Declining (invitee) and withdrawing (manager) both delete the invitation. */
export async function deleteTeamInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('team_invitations').delete().eq('id', id);
  if (error) throw error;
}

export async function acceptTeamInvitation(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_team_invitation', { p_invitation: id });
  if (error) throw error;
  return data as string;
}

// ======================== BOARD ========================

export async function getTeamPosts(teamId: string, limit = 50): Promise<TeamPost[]> {
  const { data, error } = await supabase
    .from('team_posts')
    .select('*')
    .eq('team_id', teamId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return mapRows<TeamPost>(data ?? []);
}

export async function createTeamPost(dto: {
  teamId: string;
  body: string;
  image?: string | null;
  list?: { title: string; data: ParsedArmyList } | null;
}): Promise<TeamPost> {
  const { data, error } = await supabase
    .from('team_posts')
    .insert({
      team_id: dto.teamId,
      body: dto.body,
      image: dto.image ?? null,
      kind: dto.list ? 'list' : 'post',
      list_title: dto.list?.title ?? null,
      list_data: dto.list?.data ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<TeamPost>(data);
}

export async function setTeamPostPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('team_posts').update({ pinned }).eq('id', id);
  if (error) throw error;
}

export async function deleteTeamPost(id: string): Promise<void> {
  const { error } = await supabase.from('team_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function getTeamPostComments(postId: string): Promise<TeamPostComment[]> {
  const { data, error } = await supabase.from('team_post_comments').select('*').eq('post_id', postId).order('created_at');
  if (error) return [];
  return mapRows<TeamPostComment>(data ?? []);
}

export async function addTeamPostComment(postId: string, teamId: string, body: string): Promise<TeamPostComment> {
  const { data, error } = await supabase.from('team_post_comments').insert({ post_id: postId, team_id: teamId, body }).select().single();
  if (error) throw error;
  return mapRow<TeamPostComment>(data);
}

export async function deleteTeamPostComment(id: string): Promise<void> {
  const { error } = await supabase.from('team_post_comments').delete().eq('id', id);
  if (error) throw error;
}

// ======================== CHAT ========================

export async function getTeamMessages(teamId: string, limit = 150): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('team_messages')
    .select('id, author_id, body, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return mapRows<ChatMessage>(data ?? []).reverse();
}

export async function sendTeamMessage(teamId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from('team_messages').insert({ team_id: teamId, body }).select('id, author_id, body, created_at').single();
  if (error) throw error;
  return mapRow<ChatMessage>(data);
}

/** Live inserts into a group chat table (RLS limits events to members). */
export function subscribeToChat(
  table: 'team_messages' | 'match_messages',
  column: 'team_id' | 'match_id',
  id: string,
  onMessage: (m: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`${table}:${id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `${column}=eq.${id}` }, (payload) =>
      onMessage(mapRow<ChatMessage>(payload.new as Record<string, unknown>)),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ======================== TOURNAMENTS ========================

/** Which of the given users attend each tournament: tournamentId → userIds. */
export async function getAttendanceOf(userIds: string[]): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase.from('tournament_attendees').select('tournament_id, user_id').in('user_id', userIds);
  const map = new Map<string, string[]>();
  if (error) return map;
  for (const row of data ?? []) {
    const list = map.get(row.tournament_id) ?? [];
    list.push(row.user_id);
    map.set(row.tournament_id, list);
  }
  return map;
}
