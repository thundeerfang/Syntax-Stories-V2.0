'use client';

import { useCallback, useEffect, useState } from 'react';
import Grid from '@mui/material/Grid2';
import { Alert, Stack } from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { SecuritySectionCard } from './SecuritySectionCard';
import { SecurityStatTile } from './SecurityStatTile';
import { fetchIamMetrics, type IamMetricsPayload } from '@/admin/api/management';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

export function IamMetricsPanel() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [metrics, setMetrics] = useState<IamMetricsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!apiToken && !httpOnlyCookies) return;
    if (!hasPermission('audit:read')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const m = await fetchIamMetrics(apiToken);
      setMetrics(m);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Step-up cancelled') return;
      setError(msg || 'Failed to load IAM metrics');
    } finally {
      setLoading(false);
    }
  }, [apiToken, httpOnlyCookies, hasPermission]);

  useEffect(() => {
    void load();
  }, [load]);

  const metricEntries = metrics ? Object.entries(metrics.metrics) : [];

  if (!hasPermission('audit:read')) {
    return (
      <Stack spacing={3}>
        <AdminBlinkSectionHeader title="IAM metrics" />
        <Alert severity="info">You need audit read permission to view IAM metrics.</Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <AdminBlinkSectionHeader title="IAM metrics" />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <SecuritySectionCard
        icon={InsightsRoundedIcon}
        title="Platform identity health"
        subtitle={
          metrics?.derived.refreshSuccessRate != null
            ? `Refresh success rate: ${metrics.derived.refreshSuccessRate}%`
            : 'Aggregated IAM indicators for the admin platform'
        }
      >
        {loading && !metrics ? (
          <Alert severity="info">Loading metrics…</Alert>
        ) : (
          <Grid container spacing={1.5}>
            {metricEntries.map(([k, v]) => (
              <Grid key={k} size={{ xs: 12, sm: 6, md: 4 }}>
                <SecurityStatTile
                  icon={ShieldRoundedIcon}
                  label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  value={typeof v === 'number' ? v.toLocaleString() : String(v)}
                  tone="neutral"
                />
              </Grid>
            ))}
          </Grid>
        )}
      </SecuritySectionCard>
    </Stack>
  );
}
