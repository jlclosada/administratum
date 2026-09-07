import { removeAllUserFiles } from '@/lib/storage';
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
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,
  recoveryMode: false,

  init: () => {
    if (subscribed) return;
    subscribed = true;

    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        initialized: true,
      });
    });

    supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        initialized: true,
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

  signUp: async (email, password, displayName) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName
            ? { display_name: displayName, full_name: displayName }
            : undefined,
          emailRedirectTo: `${window.location.origin}/`,
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
