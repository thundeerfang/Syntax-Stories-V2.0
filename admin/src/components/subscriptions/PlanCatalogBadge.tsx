'use client';

import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';

export function PlanCatalogBadge({
  badge,
  featured,
}: {
  badge: string | null;
  featured?: boolean;
}) {
  if (!badge && !featured) {
    return null;
  }

  const label = badge?.trim() || 'Most popular';
  const isMostPopular = featured || /most\s*popular/i.test(label);

  return (
    <AdminStatusBadge
      label={label}
      tone="primary"
      emphasis={isMostPopular}
      icon={<StarRoundedIcon fontSize="inherit" />}
    />
  );
}
