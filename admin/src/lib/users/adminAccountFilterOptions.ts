import type { AdminUserAccountFilter } from '@/admin';
import type { AdminFilterOption } from '@/components/ui/AdminFilterSelect';

export const ADMIN_ACCOUNT_FILTER_OPTIONS: readonly AdminFilterOption<AdminUserAccountFilter>[] =
  [
    { value: 'all', label: 'All accounts' },
    { value: 'platform', label: 'Platform users' },
    { value: 'staff', label: 'Staff accounts' },
  ] as const;
