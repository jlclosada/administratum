import { getSessionUser, supabase } from '@/lib/supabase';
import type { AdminOverview, Profile } from '@/types';
import { getProfilesByIds } from './social';

export interface Attendee {
  profile: Profile;
  joinedAt: string;
}

/** Everyone who pressed "Asistiré", in sign-up order. */
export async function getTournamentAttendees(tournamentId: string): Promise<Attendee[]> {
  const { data, error } = await supabase
    .from('tournament_attendees')
    .select('user_id, created_at')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  const profiles = await getProfilesByIds(data.map((r) => r.user_id as string));
  return data.flatMap((r) => {
    const profile = profiles.get(r.user_id as string);
    return profile ? [{ profile, joinedAt: r.created_at as string }] : [];
  });
}

/** Ids of the tournaments the current user has signed up for. */
export async function getMyAttendance(): Promise<Set<string>> {
  const {
    data: { user },
  } = await getSessionUser();
  if (!user) return new Set();
  const { data } = await supabase.from('tournament_attendees').select('tournament_id').eq('user_id', user.id);
  return new Set((data ?? []).map((r) => r.tournament_id as string));
}

/** Signs the current user up or out. Errors carry the DB's reason (full / finished). */
export async function setAttendance(tournamentId: string, attending: boolean): Promise<void> {
  if (attending) {
    const { error } = await supabase.from('tournament_attendees').insert({ tournament_id: tournamentId });
    if (error && error.code !== '23505') throw new Error(error.message);
  } else {
    const {
      data: { user },
    } = await getSessionUser();
    const { error } = await supabase
      .from('tournament_attendees')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('user_id', user?.id ?? '');
    if (error) throw new Error(error.message);
  }
}

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const { data, error } = await supabase.rpc('admin_overview');
  if (error || !data) return null;
  return data as AdminOverview;
}
