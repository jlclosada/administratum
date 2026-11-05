import { isMatrix, type Matrix } from '@/lib/matrix';
import { supabase } from '@/lib/supabase';

// Pairing matrices of the signed-in user (RLS: only their own rows).

const toRow = (m: Matrix) => ({
  title: m.title,
  our_team: m.ourTeam,
  rival_team: m.rivalTeam,
  ours: m.ours,
  theirs: m.theirs,
  scores: m.scores,
  results: m.results,
});

function fromRow(r: Record<string, unknown>): Matrix | null {
  const m = {
    id: r.id as string,
    title: (r.title as string) ?? '',
    ourTeam: (r.our_team as string) ?? '',
    rivalTeam: (r.rival_team as string) ?? '',
    ours: r.ours,
    theirs: r.theirs,
    scores: r.scores,
    results: r.results ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
  return isMatrix(m) ? m : null;
}

export async function getMyMatrices(): Promise<Matrix[]> {
  const { data, error } = await supabase.from('pairing_matrices').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow).filter((m): m is Matrix => m !== null);
}

export async function getMatrixById(id: string): Promise<Matrix | null> {
  const { data, error } = await supabase.from('pairing_matrices').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

/** Saves a new matrix (from scratch, a guest draft or a shared link). */
export async function createMatrix(m: Matrix): Promise<Matrix> {
  const { data, error } = await supabase.from('pairing_matrices').insert(toRow(m)).select('*').single();
  if (error) throw error;
  const saved = fromRow(data);
  if (!saved) throw new Error('No se pudo guardar la matriz.');
  return saved;
}

export async function updateMatrix(m: Matrix): Promise<void> {
  const { error } = await supabase.from('pairing_matrices').update(toRow(m)).eq('id', m.id);
  if (error) throw error;
}

export async function deleteMatrix(id: string): Promise<void> {
  const { error } = await supabase.from('pairing_matrices').delete().eq('id', id);
  if (error) throw error;
}
