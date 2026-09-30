import type { SupabaseClient } from '@supabase/supabase-js';

export interface MfmSyncSummary {
  version: string | null;
  units: number;
  added: number;
  repriced: number;
  upserted: number;
  miniaturesUpdated: number;
  changes: string[];
  dryRun: boolean;
}

export function syncMfm(
  supabase: SupabaseClient,
  options?: { log?: (message: string) => void; dryRun?: boolean },
): Promise<MfmSyncSummary>;
