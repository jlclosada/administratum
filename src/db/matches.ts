import { getSessionUser, supabase } from '@/lib/supabase';
import type { ChatMessage, CreateMatchDTO, Match, MatchInvitation, MatchInvitee, MatchPlayer } from '@/types';
import { mapRow, mapRows } from './repository';

async function myId(): Promise<string> {
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) throw new Error('No hay sesión activa.');
  return user.id;
}

function toRow(dto: Partial<CreateMatchDTO>): Record<string, unknown> {
  const map: Record<string, string> = {
    title: 'title',
    description: 'description',
    format: 'format',
    pointsLimit: 'points_limit',
    hostFaction: 'host_faction',
    level: 'level',
    venueType: 'venue_type',
    venueName: 'venue_name',
    city: 'city',
    lat: 'lat',
    lng: 'lng',
    startsOn: 'starts_on',
    timeMode: 'time_mode',
    startTime: 'start_time',
    endTime: 'end_time',
    timeNote: 'time_note',
    maxPlayers: 'max_players',
  };
  const row: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(map)) {
    const v = dto[k as keyof CreateMatchDTO];
    if (v !== undefined) row[col] = v;
  }
  return row;
}

/**
 * Upcoming open games, nearest first within `radiusKm` of a point (all of
 * them when there is no point). Online games come along unless excluded.
 */
export async function searchMatches(opts: { lat?: number | null; lng?: number | null; radiusKm?: number | null; includeOnline?: boolean } = {}): Promise<Match[]> {
  const { data: hits, error } = await supabase.rpc('nearby_matches', {
    p_lat: opts.lat ?? null,
    p_lng: opts.lng ?? null,
    p_radius_km: opts.radiusKm ?? null,
    p_include_online: opts.includeOnline ?? true,
  });
  if (error || !hits?.length) return [];
  const distance = new Map((hits as { id: string; distance_km: number | null }[]).map((h) => [h.id, h.distance_km]));
  const { data } = await supabase.from('matches').select('*').in('id', [...distance.keys()]);
  const order = [...distance.keys()];
  return mapRows<Match>(data ?? [])
    .map((m) => ({ ...m, distanceKm: distance.get(m.id) ?? null }))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow<Match>(data);
}

export async function getMatchPlayers(id: string): Promise<MatchPlayer[]> {
  const { data, error } = await supabase.from('match_players').select('*').eq('match_id', id).order('joined_at');
  if (error) return [];
  return mapRows<MatchPlayer>(data ?? []);
}

/** Exact address: only players get a row back (RLS). */
export async function getMatchAddress(id: string): Promise<string | null> {
  const { data } = await supabase.from('match_private').select('address').eq('match_id', id).maybeSingle();
  return (data?.address as string | undefined) || null;
}

export async function createMatch(dto: CreateMatchDTO): Promise<Match> {
  const { data, error } = await supabase.from('matches').insert(toRow(dto)).select().single();
  if (error) throw error;
  const match = mapRow<Match>(data);
  if (dto.address?.trim()) {
    await supabase.from('match_private').upsert({ match_id: match.id, address: dto.address.trim() });
  }
  return match;
}

export async function updateMatch(id: string, dto: Partial<CreateMatchDTO>): Promise<Match> {
  const { data, error } = await supabase.from('matches').update(toRow(dto)).eq('id', id).select().single();
  if (error) throw error;
  if (dto.address !== undefined) {
    await supabase.from('match_private').upsert({ match_id: id, address: dto.address.trim() });
  }
  return mapRow<Match>(data);
}

export async function cancelMatch(id: string): Promise<void> {
  const { error } = await supabase.from('matches').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export async function joinMatch(id: string, faction: string | null): Promise<void> {
  const { error } = await supabase.from('match_players').insert({ match_id: id, faction });
  if (error) {
    throw new Error(error.code === '42501' ? 'La partida ya está completa o ha terminado.' : error.message);
  }
}

export async function leaveMatch(id: string): Promise<void> {
  const me = await myId();
  const { error } = await supabase.from('match_players').delete().eq('match_id', id).eq('user_id', me);
  if (error) throw error;
}

export async function removeMatchPlayer(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('match_players').delete().eq('match_id', id).eq('user_id', userId);
  if (error) throw error;
}

/** Games the current user hosts or plays in, from today on. */
export async function getMyMatches(): Promise<Match[]> {
  const me = await myId();
  const { data: seats } = await supabase.from('match_players').select('match_id').eq('user_id', me);
  if (!seats?.length) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('matches')
    .select('*')
    .in('id', seats.map((s) => s.match_id))
    .gte('starts_on', today)
    .order('starts_on');
  return mapRows<Match>(data ?? []);
}

export async function getMatchMessages(id: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('match_messages')
    .select('id, author_id, body, created_at')
    .eq('match_id', id)
    .order('created_at')
    .limit(300);
  if (error) return [];
  return mapRows<ChatMessage>(data ?? []);
}

export async function sendMatchMessage(id: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from('match_messages').insert({ match_id: id, body }).select('id, author_id, body, created_at').single();
  if (error) throw error;
  return mapRow<ChatMessage>(data);
}

// ======================== INVITATIONS ========================

/** The host sees every invitation of the game; a player only theirs. */
export async function getMatchInvitations(matchId: string): Promise<MatchInvitation[]> {
  const { data, error } = await supabase.from('match_invitations').select('*').eq('match_id', matchId).order('created_at');
  if (error) return [];
  return mapRows<MatchInvitation>(data ?? []);
}

export async function inviteToMatch(matchId: string, invitee: MatchInvitee): Promise<MatchInvitation> {
  const row: Record<string, string> =
    invitee.kind === 'user' ? { match_id: matchId, invited_user: invitee.profile.id } : { match_id: matchId, email: invitee.email.trim().toLowerCase() };
  const { data, error } = await supabase.from('match_invitations').insert(row).select().single();
  if (error) {
    throw new Error(error.code === '23505' ? 'Ya habías invitado a ese jugador.' : error.message);
  }
  return mapRow<MatchInvitation>(data);
}

export async function withdrawMatchInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('match_invitations').delete().eq('id', id);
  if (error) throw error;
}

/** By id (invited player) or with the token from the email link. Returns the game id. */
export async function acceptMatchInvitation(opts: { id?: string; token?: string; faction?: string | null }): Promise<string> {
  const { data, error } = await supabase.rpc('accept_match_invitation', {
    p_invitation: opts.id ?? null,
    p_token: opts.token ?? null,
    p_faction: opts.faction ?? null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function declineMatchInvitation(opts: { id?: string; token?: string }): Promise<void> {
  const { error } = await supabase.rpc('decline_match_invitation', { p_invitation: opts.id ?? null, p_token: opts.token ?? null });
  if (error) throw error;
}

/** What an email link points to, readable before signing in. */
export async function getMatchInvitationByToken(token: string): Promise<{ matchId: string; hostName: string; status: MatchInvitation['status'] } | null> {
  const { data } = await supabase.rpc('match_invitation_by_token', { p_token: token });
  const row = (data as { match_id: string; host_name: string; status: MatchInvitation['status'] }[] | null)?.[0];
  return row ? { matchId: row.match_id, hostName: row.host_name, status: row.status } : null;
}

/** Emails the game's pending invitations (server: api/email.ts, action "match-invite"). */
export async function sendMatchInviteEmails(matchId: string): Promise<number> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch('/api/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ action: 'match-invite', matchId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'No se pudieron enviar los correos.');
  return Number(body.sent ?? 0);
}
