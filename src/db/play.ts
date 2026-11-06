import type {
  PlayEntry,
  PlayEntryPlayer,
  PlayGame,
  PlayList,
  PlayMatch,
  PlayPayment,
  PlayRound,
  PlayTournament,
  PaymentStatus,
  EntryStatus,
} from '@/lib/play/types';
import { getSessionUser, supabase } from '@/lib/supabase';
import type { PairingPick, PickKind } from '@/lib/play/wtc';
import { mapRow, mapRows } from './repository';

// Tournaments organised in Administratum (play_* tables, see schema.sql).

export type PlayTournamentDTO = Omit<PlayTournament, 'id' | 'organizerId' | 'createdAt' | 'updatedAt'>;

const snake = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]));

function toTournament(row: Record<string, unknown>): PlayTournament {
  const t = mapRow<PlayTournament>(row);
  return { ...t, entryFee: Number(t.entryFee ?? 0) };
}

async function me(): Promise<string> {
  const { data } = await getSessionUser();
  if (!data.user) throw new Error('Inicia sesión para continuar.');
  return data.user.id;
}

// ---------------------------------------------------------------- tournaments

/** Published tournaments (not drafts), soonest first. */
export async function getPlayTournaments(): Promise<PlayTournament[]> {
  const { data, error } = await supabase.from('play_tournaments').select('*').neq('status', 'draft').order('starts_on');
  if (error) return [];
  return (data ?? []).map(toTournament);
}

export async function getMyOrganizedTournaments(): Promise<PlayTournament[]> {
  const uid = await me();
  const { data, error } = await supabase.from('play_tournaments').select('*').eq('organizer_id', uid).order('starts_on', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toTournament);
}

/** Tournaments the signed-in user plays in (any entry they captain or belong to). */
export async function getMyPlayingTournaments(): Promise<{ tournament: PlayTournament; entry: PlayEntry }[]> {
  const uid = await me();
  const [{ data: asPlayer }, { data: asCaptain }] = await Promise.all([
    supabase.from('play_entry_players').select('entry_id').eq('user_id', uid),
    supabase.from('play_entries').select('id').eq('captain_id', uid),
  ]);
  const ids = [...new Set([...(asPlayer ?? []).map((r) => r.entry_id as string), ...(asCaptain ?? []).map((r) => r.id as string)])];
  if (!ids.length) return [];
  const { data: entries } = await supabase.from('play_entries').select('*').in('id', ids).neq('status', 'withdrawn');
  const list = mapRows<PlayEntry>(entries ?? []);
  if (!list.length) return [];
  const { data: ts } = await supabase.from('play_tournaments').select('*').in('id', [...new Set(list.map((e) => e.tournamentId))]);
  const byId = new Map((ts ?? []).map((r) => [r.id as string, toTournament(r)]));
  return list
    .filter((e) => byId.has(e.tournamentId))
    .map((entry) => ({ tournament: byId.get(entry.tournamentId)!, entry }))
    .sort((a, b) => a.tournament.startsOn.localeCompare(b.tournament.startsOn));
}

export async function getPlayTournament(id: string): Promise<PlayTournament | null> {
  const { data, error } = await supabase.from('play_tournaments').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return toTournament(data);
}

export async function createPlayTournament(dto: PlayTournamentDTO): Promise<PlayTournament> {
  const { data, error } = await supabase.from('play_tournaments').insert(snake({ ...dto })).select('*').single();
  if (error) throw error;
  return toTournament(data);
}

export async function updatePlayTournament(id: string, dto: Partial<PlayTournamentDTO>): Promise<PlayTournament> {
  const { data, error } = await supabase.from('play_tournaments').update(snake({ ...dto })).eq('id', id).select('*').single();
  if (error) throw error;
  return toTournament(data);
}

export async function deletePlayTournament(id: string): Promise<void> {
  const { error } = await supabase.from('play_tournaments').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------- entries

export async function getPlayEntries(tournamentId: string): Promise<PlayEntry[]> {
  const { data, error } = await supabase.from('play_entries').select('*').eq('tournament_id', tournamentId).order('created_at');
  if (error) return [];
  return mapRows<PlayEntry>(data ?? []);
}

export async function getPlayEntryPlayers(tournamentId: string): Promise<PlayEntryPlayer[]> {
  const { data, error } = await supabase.from('play_entry_players').select('*').eq('tournament_id', tournamentId).order('position');
  if (error) return [];
  return mapRows<PlayEntryPlayer>(data ?? []);
}

/** The organiser sees every payment; an entry only its own (RLS). */
export async function getPlayPayments(tournamentId: string): Promise<PlayPayment[]> {
  const { data, error } = await supabase.from('play_entry_payments').select('*').eq('tournament_id', tournamentId);
  if (error) return [];
  return mapRows<PlayPayment>(data ?? []);
}

export interface RegisterPlayer {
  userId: string | null;
  displayName: string;
  faction: string;
}

export async function registerForPlay(tournamentId: string, name: string, teamId: string | null, players: RegisterPlayer[]): Promise<string> {
  const { data, error } = await supabase.rpc('play_register', {
    p_tournament: tournamentId,
    p_name: name,
    p_team: teamId,
    p_players: players.map((p) => ({ user_id: p.userId, display_name: p.displayName, faction: p.faction })),
  });
  if (error) throw error;
  return data as string;
}

export async function joinPlayEntry(entryId: string, code: string, displayName: string, faction: string): Promise<void> {
  const { error } = await supabase.rpc('play_join_entry', { p_entry: entryId, p_code: code, p_display_name: displayName, p_faction: faction });
  if (error) throw error;
}

export async function updatePlayEntry(
  entryId: string,
  change: { name?: string; players?: { id: string; faction?: string; displayName?: string; position?: number; remove?: boolean }[]; withdraw?: boolean },
): Promise<void> {
  const { error } = await supabase.rpc('play_update_entry', {
    p_entry: entryId,
    p_name: change.name ?? null,
    p_players: change.players?.map((p) => ({ id: p.id, faction: p.faction, display_name: p.displayName, position: p.position, remove: p.remove })) ?? null,
    p_withdraw: !!change.withdraw,
  });
  if (error) throw error;
}

export async function leavePlayEntry(entryPlayerId: string): Promise<void> {
  const { error } = await supabase.rpc('play_leave_entry', { p_entry_player: entryPlayerId });
  if (error) throw error;
}

/** Tells the organiser the entry has paid, with an optional receipt (private file). */
export async function submitPlayPayment(tournamentId: string, entryId: string, reference: string, receipt: File | null): Promise<void> {
  let path: string | null = null;
  if (receipt) {
    if (receipt.size > 5 * 1024 * 1024) throw new Error('El justificante no puede pasar de 5 MB.');
    const uid = await me();
    const ext = receipt.name.split('.').pop()?.toLowerCase() || 'jpg';
    path = `${tournamentId}/${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path, receipt, { upsert: false });
    if (error) throw error;
  }
  const { error } = await supabase.rpc('play_submit_payment', { p_entry: entryId, p_reference: reference, p_receipt_path: path });
  if (error) throw error;
}

export async function getReceiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// Organiser actions (RLS: only the organiser can write these directly).

export async function setPaymentStatus(entryId: string, status: PaymentStatus, note = ''): Promise<void> {
  const { error } = await supabase
    .from('play_entry_payments')
    .update({ status, organizer_note: note, reviewed_at: new Date().toISOString() })
    .eq('entry_id', entryId);
  if (error) throw error;
}

export async function setEntryStatus(entryId: string, status: EntryStatus): Promise<void> {
  const { error } = await supabase.from('play_entries').update({ status }).eq('id', entryId);
  if (error) throw error;
}

export async function setEntryDropped(entryId: string, dropped: boolean): Promise<void> {
  const { error } = await supabase.from('play_entries').update({ dropped }).eq('id', entryId);
  if (error) throw error;
}

/** Walk-ins: the organiser adds an entry by hand (players may have no account). */
export async function addEntryByOrganizer(tournamentId: string, name: string, players: { displayName: string; faction: string }[], paid: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('play_entries')
    .insert({ tournament_id: tournamentId, name, captain_id: null })
    .select('id')
    .single();
  if (error) throw error;
  const entryId = data.id as string;
  const { error: e2 } = await supabase.from('play_entry_players').insert(
    players.map((p, i) => ({ entry_id: entryId, tournament_id: tournamentId, display_name: p.displayName, faction: p.faction, position: i })),
  );
  if (e2) throw e2;
  const { error: e3 } = await supabase.from('play_entry_payments').insert({ entry_id: entryId, tournament_id: tournamentId, status: paid ? 'paid' : 'pending' });
  if (e3) throw e3;
}

export async function deleteEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('play_entries').delete().eq('id', entryId);
  if (error) throw error;
}

// ---------------------------------------------------------------- lists

export async function getPlayLists(tournamentId: string): Promise<PlayList[]> {
  const { data, error } = await supabase.from('play_lists').select('*').eq('tournament_id', tournamentId);
  if (error) return [];
  return mapRows<PlayList>(data ?? []);
}

export async function savePlayList(list: Pick<PlayList, 'entryPlayerId' | 'tournamentId' | 'entryId' | 'faction' | 'detachment' | 'listText'>): Promise<void> {
  const { error } = await supabase.from('play_lists').upsert({
    entry_player_id: list.entryPlayerId,
    tournament_id: list.tournamentId,
    entry_id: list.entryId,
    faction: list.faction,
    detachment: list.detachment,
    list_text: list.listText,
    submitted_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ---------------------------------------------------------------- rounds, matches, games

export async function getPlayRounds(tournamentId: string): Promise<PlayRound[]> {
  const { data, error } = await supabase.from('play_rounds').select('*').eq('tournament_id', tournamentId).order('number');
  if (error) return [];
  return mapRows<PlayRound>(data ?? []);
}

export async function getPlayMatches(tournamentId: string): Promise<PlayMatch[]> {
  const { data, error } = await supabase.from('play_matches').select('*').eq('tournament_id', tournamentId).order('table_no');
  if (error) return [];
  return mapRows<PlayMatch>(data ?? []);
}

export async function getPlayGames(tournamentId: string): Promise<PlayGame[]> {
  const { data, error } = await supabase.from('play_games').select('*').eq('tournament_id', tournamentId).order('table_no');
  if (error) return [];
  return mapRows<PlayGame>(data ?? []);
}

export async function getPlayGame(id: string): Promise<PlayGame | null> {
  const { data, error } = await supabase.from('play_games').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapRow<PlayGame>(data);
}

export async function createPlayRound(
  tournamentId: string,
  number: number,
  pairs: { a: string; b: string | null; table: number }[],
  deployment = '',
  layout = '',
): Promise<string> {
  const { data, error } = await supabase.rpc('play_create_round', {
    p_tournament: tournamentId,
    p_number: number,
    p_pairs: pairs,
    p_deployment: deployment,
    p_layout: layout,
  });
  if (error) throw error;
  return data as string;
}

export async function deletePlayRound(roundId: string): Promise<void> {
  const { error } = await supabase.from('play_rounds').delete().eq('id', roundId);
  if (error) throw error;
}

export async function setPlayRoundStatus(roundId: string, status: PlayRound['status']): Promise<void> {
  const { error } = await supabase.from('play_rounds').update({ status }).eq('id', roundId);
  if (error) throw error;
}

export async function setMatchGames(matchId: string, pairs: { a: string; b: string; table: number }[]): Promise<void> {
  const { error } = await supabase.rpc('play_set_match_games', { p_match: matchId, p_pairs: pairs });
  if (error) throw error;
}

export async function updatePlayGame(id: string, patch: Partial<Pick<PlayGame, 'setup' | 'rounds' | 'vpA' | 'vpB' | 'status'>>): Promise<void> {
  const { error } = await supabase.from('play_games').update(snake({ ...patch })).eq('id', id);
  if (error) throw error;
}

export async function confirmPlayGame(id: string): Promise<PlayGame['status']> {
  const { data, error } = await supabase.rpc('play_confirm_game', { p_game: id });
  if (error) throw error;
  return data as PlayGame['status'];
}

/** Live updates of a tournament's games and pairings. */
export function subscribeToPlay(tournamentId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`play:${tournamentId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_games', filter: `tournament_id=eq.${tournamentId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_matches', filter: `tournament_id=eq.${tournamentId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_pairing_picks', filter: `tournament_id=eq.${tournamentId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------- secret matrices

export async function getMatchMatrix(matchId: string, entryId: string): Promise<unknown | null> {
  const { data } = await supabase.from('play_match_matrices').select('data').eq('match_id', matchId).eq('entry_id', entryId).maybeSingle();
  return data?.data ?? null;
}

export async function saveMatchMatrix(matchId: string, entryId: string, data: unknown): Promise<void> {
  const { error } = await supabase.from('play_match_matrices').upsert({ match_id: matchId, entry_id: entryId, data });
  if (error) throw error;
}

// ---------------------------------------------------------------- WTC pairing

/** Our picks, and the other team's once revealed (RLS keeps them secret until then). */
export async function getPairingPicks(matchId: string): Promise<PairingPick[]> {
  const { data, error } = await supabase.from('play_pairing_picks').select('entry_id,step,kind,players').eq('match_id', matchId);
  if (error) return [];
  return (data ?? []).map((r) => ({ entryId: r.entry_id as string, step: r.step as number, kind: r.kind as PickKind, players: r.players as string[] }));
}

export async function submitPairingPick(matchId: string, step: number, kind: PickKind, players: string[]): Promise<void> {
  const { error } = await supabase.rpc('play_submit_pick', { p_match: matchId, p_step: step, p_kind: kind, p_players: players });
  if (error) throw error;
}

/** Organiser: start the pairing of a match over. */
export async function resetPairing(matchId: string): Promise<void> {
  const { error } = await supabase.from('play_pairing_picks').delete().eq('match_id', matchId);
  if (error) throw error;
}
