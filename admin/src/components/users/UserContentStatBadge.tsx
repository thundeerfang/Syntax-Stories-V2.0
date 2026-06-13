'use client';

import type { ReactNode } from 'react';
import { AdminStatusBadge, type AdminStatusBadgeTone } from '@/components/ui/AdminStatusBadge';

export function UserContentStatBadge({
  label,
  count,
  icon,
  tone = 'neutral',
}: {
  label: string;
  count: number;
  icon: ReactNode;
  tone?: AdminStatusBadgeTone;
}) {
  return (
    <AdminStatusBadge
      label={`${label}: ${count.toLocaleString()}`}
      tone={tone}
      emphasis={count > 0}
      icon={icon}
    />
  );
}
