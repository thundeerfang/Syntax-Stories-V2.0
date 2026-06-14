"use client";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/store/auth";
export function useSettingsAuthSlice() {
  return useAuthStore(
    useShallow((s) => ({
      user: s.user,
      updateProfile: s.updateProfile,
      refreshUser: s.refreshUser,
      token: s.token,
    })),
  );
}
