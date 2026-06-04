'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Shared accounts search query (`?q=`) for navbar and Users → Accounts tab. */
export function useAdminAccountsSearchQuery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const setQuery = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');

      const base = '/users';
      const qs = params.toString();
      router.replace(`${base}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  return { query, setQuery };
}
