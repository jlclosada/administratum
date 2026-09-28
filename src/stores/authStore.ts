import { removeAllUserFiles } from '@/lib/storage';
import { setSentryUser } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  loading: boolean;
  /** True while the user arrived from a password-recovery email link. */
  recoveryMode: boolean;
  /**
   * Sign-in/sign-up screen requested while browsing as a guest. It opens over
   * the current URL, so after signing in the user stays on the same page.
   */
  authPrompt: 'login' | 'signup' | null;
  openAuth: (mode?: 'login' | 'signup') => void;
  closeAuth: () => void;
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  /** Redirects to Google; the user comes back to /auth/confirmar signed in. */
  signInWithGoogle: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearRecoveryMode: () => void;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

let subscribed = false;

const RETURN_KEY = 'auth-return-to';

/** Remembers the page the user was on, to come back after an auth redirect. */
function rememberReturnTo() {
  try {
    const here = window.location.pathname + window.location.search;
    if (here !== '/' && !here.startsWith('/auth/')) sessionStorage.setItem(RETURN_KEY, here);
  } catch {
    // Storage blocked: they'll land on the home page instead.
  }
}

/** The page to go back to after signing in (and forgets it), or "/". */
export function takeReturnTo(): string {
  try {
    const to = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    // Only same-site paths: never an absolute URL from storage.
    if (to && to.startsWith('/') && !to.startsWith('//')) return to;
  } catch {
    // Ignore: fall back to home.
  }
  return '/';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,
  recoveryMode: false,
  authPrompt: null,

  openAuth: (mode = 'login') => {
    rememberReturnTo();
    set({ authPrompt: mode });
  },
  closeAuth: () => set({ authPrompt: null }),

  init: () => {
    if (subscribed) return;
    subscribed = true;

    supabase.auth.getSession().then(({ data }) => {
      setSentryUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null);
      set({
        session: data.session,
        user: data.session?.user ?? null,
        initialized: true,
      });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      setSentryUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
      set({
        session,
        user: session?.user ?? null,
        initialized: true,
        ...(session ? { authPrompt: null } : {}),
        ...(event === 'PASSWORD_RECOVERY' ? { recoveryMode: true } : {}),
      });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    rememberReturnTo();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirmar?flow=oauth`,
        // Let people with several Google accounts pick one every time.
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
  },

  signUp: async (email, password, displayName) => {
    set({ loading: true });
    try {
      // Called only after the user has checked "acepto los términos" in the
      // signup form, so this timestamp doubles as a record of that consent.
      const metadata: Record<string, string> = {
        terms_accepted_at: new Date().toISOString(),
      };
      if (displayName) {
        metadata.display_name = displayName;
        metadata.full_name = displayName;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          // Lands on the confirmation page, which signs the user in.
          emailRedirectTo: `${window.location.origin}/auth/confirmar`,
        },
      });
      if (error) throw error;
      // If email confirmations are enabled, there is no active session yet.
      return { needsConfirmation: !data.session };
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (email) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (displayName) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: displayName, full_name: displayName },
      });
      if (error) throw error;
      set({ user: data.user });
    } finally {
      set({ loading: false });
    }
  },

  updateEmail: async (newEmail) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${window.location.origin}/` },
      );
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  updatePassword: async (newPassword) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      set({ user: data.user });
    } finally {
      set({ loading: false });
    }
  },

  clearRecoveryMode: () => set({ recoveryMode: false }),

  deleteAccount: async () => {
    set({ loading: true });
    try {
      // Best-effort: remove all of the user's uploaded media first.
      await removeAllUserFiles();
      // Deletes the auth user via a security-definer RPC. Cascades remove all rows.
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      set({ user: null, session: null, recoveryMode: false });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, recoveryMode: false });
  },
}));
