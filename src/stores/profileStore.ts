import { getMyProfile, updateMyProfile } from '@/db';
import type { Profile, UpdateProfileDTO } from '@/types';
import { create } from 'zustand';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
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
      set({ profile, fetched: true });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (dto) => {
    const profile = await updateMyProfile(dto);
    set({ profile, fetched: true });
  },

  clear: () => set({ profile: null, fetched: false }),
}));
