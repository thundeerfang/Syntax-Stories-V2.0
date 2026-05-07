'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SessionState = {
  token: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setSession: (token: string | null, refreshToken: string | null) => void;
  setHydrated: () => void;
  logout: () => void;
};

const KEY = 'syntax-stories-admin-session';

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      hydrated: false,
      setSession: (token, refreshToken) => set({ token, refreshToken }),
      setHydrated: () => set({ hydrated: true }),
      logout: () => set({ token: null, refreshToken: null }),
    }),
    {
      name: KEY,
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken }),
      onRehydrateStorage: () => () => {
        useSessionStore.getState().setHydrated();
      },
    }
  )
);
