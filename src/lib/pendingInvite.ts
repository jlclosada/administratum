/**
 * A game invitation opened from an email before having an account: the
 * token survives sign-up (same browser) so the app can bring the new user
 * back to the game to accept it.
 */
const KEY = "administratum:match-invite";

export interface PendingInvite {
  matchId: string;
  token: string;
}

export function savePendingInvite(invite: PendingInvite): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(invite));
  } catch {
    // Private mode: the email link still works when opened again.
  }
}

export function pendingInvite(): PendingInvite | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingInvite) : null;
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
