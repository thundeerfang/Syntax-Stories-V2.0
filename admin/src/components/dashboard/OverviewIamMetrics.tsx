'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { fetchIamMetrics, type IamMetricsPayload } from '@/admin/api/management';
import { useSessionStore } from '@/store/session';

export function OverviewIamMetrics() {
  const token = useSessionStore((s) => s.token);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [data, setData] = useState<IamMetricsPayload | null>(null);

  useEffect(() => {
    if (!token || !hasPermission('audit:read')) return;
    void fetchIamMetrics(token)
      .then(setData)
      .catch(() => setData(null));
  }, [token, hasPermission]);

  if (!hasPermission('audit:read')) return null;
  if (!data) return null;

  const highlight = [
    ['refresh_failure', data.metrics.refresh_failure],
    ['permission_denied', data.metrics.permission_denied],
    ['refresh_token_reuse', data.metrics.refresh_token_reuse],
  ] as const;

  return (
    <Alert severity="info" icon={false}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          IAM health (live)
        </Typography>
        <Box className="flex flex-wrap gap-1">
          {highlight.map(([k, v]) => (
            <Chip key={k} size="small" label={`${k}: ${v}`} variant="outlined" />
          ))}
          {data.derived.refreshSuccessRate != null ? (
            <Chip
              size="small"
              label={`refresh OK: ${data.derived.refreshSuccessRate}%`}
              color="success"
              variant="outlined"
            />
          ) : null}
        </Box>
        <Typography variant="caption" component={Link} href="/audit" sx={{ color: 'primary.main' }}>
          View full audit log →
        </Typography>
      </Stack>
    </Alert>
  );
}
