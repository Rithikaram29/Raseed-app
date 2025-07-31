// src/store/userStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfile {
  name?: string;
  email: string;
  image?: string;
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile) => void;
  clearUser: () => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  onHydrate?: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      _hasHydrated: false,
      setHasHydrated: (state: any) => {
        set({ _hasHydrated: state });
        console.log('Zustand store hydrated:', state, 'User:', get().user);
      },
    }),
    {
      name: "user-storage", // localStorage key
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
