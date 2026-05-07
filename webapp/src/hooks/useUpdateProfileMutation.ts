'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileUpdateSection, UpdateProfilePayload } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

const PROFILE_MUTATION_KEY = ['auth', 'profile'] as const;

/**
 * Wraps Zustand `updateProfile` in a TanStack mutation for loading/error state and retries.
 * Settings pages can migrate incrementally from direct `updateProfile` calls.
 * Pass `{ data, section }` to hit `PATCH /auth/profile/:section`.
 */
export function useUpdateProfileMutation() {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: PROFILE_MUTATION_KEY,
    mutationFn: (vars: { data: UpdateProfilePayload; section?: ProfileUpdateSection }) =>
      updateProfile(vars.data, vars.section ? { section: vars.section } : undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_MUTATION_KEY });
    },
  });
}
