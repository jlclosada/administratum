import { getMyProfile, updateMyProfile } from '@/db';
import type { Profile, UpdateProfileDTO } from '@/types';
import { create } from 'zustand';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  /** The first load has finished (successfully or not). */
  fetched: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (dto: UpdateProfileDTO) => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,
  fetched: false,

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const profile = await getMyProfile();
      set({ profile });
    } catch {
      // Network hiccup at startup: the app works without the profile row
      // (name falls back to auth metadata); it loads again on the next visit.
    } finally {
      // `fetched` = the attempt finished, even if it failed: the app gate
      // waits for it before deciding whether to show the welcome wizard.
      set({ loading: false, fetched: true });
    }
  },

  updateProfile: async (dto) => {
    const profile = await updateMyProfile(dto);
    set({ profile, fetched: true });
  },

  clear: () => set({ profile: null, fetched: false }),
}));
