'use client';

import { useSessionStore } from '@/store/session';
import { AdminSearchField } from '@/components/ui/AdminSearchField';
import { useAdminAccountsSearchQuery } from '@/lib/users/useAdminAccountsSearchQuery';

export function NavbarUserSearch() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const { query, setQuery } = useAdminAccountsSearchQuery();

  if (!hasPermission('user:list')) return null;

  return (
    <AdminSearchField
      value={query}
      onChange={setQuery}
      placeholder="Search email, username, or name"
      aria-label="Search platform accounts"
      sx={{
        m: 0,
        minWidth: { sm: 200, md: 240 },
        maxWidth: 320,
        display: { xs: 'none', sm: 'block' },
      }}
    />
  );
}
