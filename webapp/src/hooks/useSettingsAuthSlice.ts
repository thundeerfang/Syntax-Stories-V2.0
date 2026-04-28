'use client';

import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/store/auth';

/**
 * Narrow auth slice for settings profile sections: avoids re-renders when unrelated
 * store fields change (e.g. twoFactor, isLoading).
 */
export function useSettingsAuthSlice() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      updateProfile: s.updateProfile,
      refreshUser: s.refreshUser,
      token: s.token,
    }))
  );
}
