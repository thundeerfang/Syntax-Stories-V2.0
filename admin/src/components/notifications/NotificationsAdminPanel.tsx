'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import WebhookRoundedIcon from '@mui/icons-material/WebhookRounded';
import { AdminBlinkSectionHeader } from '@/components/ui/AdminBlinkSectionHeader';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import {
  getAdminNotificationConfig,
  getAdminNotificationStats,
  listAdminNotificationAudit,
  patchAdminNotificationConfig,
  postAdminNotificationWebhookTest,
  type NotificationAuditRow,
  type NotificationDeliveryStats,
  type PlatformNotificationConfig,
} from '@/lib/notifications/notificationsAdmin';

type NotificationsAdminPanelProps = {
  token: string | null;
  canManage: boolean;
};

const auditColumns = [
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }: { row: { original: NotificationAuditRow } }) =>
      row.original.timestamp
        ? new Date(row.original.timestamp).toLocaleString()
        : '—',
  },
  { accessorKey: 'action', header: 'Action' },
  {
    accessorKey: 'userId',
    header: 'User',
    cell: ({ row }: { row: { original: NotificationAuditRow } }) =>
      row.original.userId ?? '—',
  },
  {
    accessorKey: 'metadata',
    header: 'Details',
    cell: ({ row }: { row: { original: NotificationAuditRow } }) => {
      const m = row.original.metadata;
      if (!m) return '—';
      const keys = Object.keys(m).slice(0, 3);
      return keys.map((k) => `${k}: ${String(m[k])}`).join(' · ') || '—';
    },
  },
];

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
          {value.toLocaleString()}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function NotificationsAdminPanel({ token, canManage }: NotificationsAdminPanelProps) {
  const [config, setConfig] = useState<PlatformNotificationConfig | null>(null);
  const [stats, setStats] = useState<NotificationDeliveryStats | null>(null);
  const [audit, setAudit] = useState<NotificationAuditRow[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  const columns = useMemo(() => auditColumns, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cfg, st, auditPage] = await Promise.all([
        getAdminNotificationConfig(token),
        getAdminNotificationStats(token),
        listAdminNotificationAudit(token, { limit: 50 }),
      ]);
      setConfig(cfg);
      setStats(st);
      setAudit(auditPage.items);
      setAuditCursor(auditPage.nextCursor);
      setWebhookEnabled(cfg.webhookEnabled);
      setWebhookUrl(cfg.webhookUrl);
      setWebhookSecret(cfg.webhookSecret ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications admin data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async () => {
    if (!token || !canManage) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await patchAdminNotificationConfig(token, {
        webhookEnabled,
        webhookUrl: webhookUrl.trim(),
        webhookSecret: webhookSecret.trim() || null,
      });
      setConfig(updated);
      setSuccess('Platform webhook configuration saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!token || !canManage) return;
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await postAdminNotificationWebhookTest(token);
      setSuccess(r.message);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test webhook failed');
    } finally {
      setTesting(false);
    }
  };

  const loadMoreAudit = async () => {
    if (!token || !auditCursor) return;
    try {
      const page = await listAdminNotificationAudit(token, { limit: 50, cursor: auditCursor });
      setAudit((prev) => [...prev, ...page.items]);
      setAuditCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more audit rows');
    }
  };

  if (!canManage) {
    return (
      <Alert severity="warning">
        Notifications infrastructure is restricted to Super Admin operators with{' '}
        <code>notification:manage</code>.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {error ? <AdminFeedbackMessage severity="error" message={error} /> : null}
      {success ? <AdminFeedbackMessage severity="success" message={success} /> : null}

      <AdminBlinkSectionHeader
        title="Delivery overview"
        icon={<NotificationsActiveRoundedIcon fontSize="small" />}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total inbox rows" value={stats?.totalNotifications ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Unread" value={stats?.unreadNotifications ?? 0} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Webhook sent" value={stats?.webhookSent ?? 0} hint="Audit log count" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Webhook failed" value={stats?.webhookFailed ?? 0} hint="Last failures" />
        </Grid>
      </Grid>

      <AdminBlinkSectionHeader
        title="Platform webhook"
        icon={<WebhookRoundedIcon fontSize="small" />}
        action={
          config?.updatedAt ? (
            <Chip size="small" label={`Updated ${new Date(config.updatedAt).toLocaleString()}`} />
          ) : null
        }
      />
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              Outbound webhooks are platform infrastructure — not configurable by end users. POSTs
              fire for every persisted notification when enabled. Requires root session tier to
              save.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  disabled={saving}
                />
              }
              label="Enable platform webhook delivery"
            />
            <TextField
              label="Webhook URL"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              fullWidth
              disabled={saving}
              placeholder="https://hooks.example.com/syntax-stories/notifications"
              helperText="Receives JSON: { event: notification.created, notification, ts }"
            />
            <TextField
              label="Webhook secret (optional)"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              fullWidth
              disabled={saving}
              type="password"
              autoComplete="new-password"
              helperText={
                config?.hasWebhookSecret && !webhookSecret
                  ? 'A secret is configured. Enter a new value to rotate, or leave blank to keep.'
                  : 'Sent as X-Webhook-Secret header on each POST.'
              }
            />
            <Box display="flex" gap={1.5} flexWrap="wrap">
              <Button variant="contained" onClick={() => void saveConfig()} disabled={saving}>
                {saving ? 'Saving…' : 'Save webhook config'}
              </Button>
              <Button variant="outlined" onClick={() => void runTest()} disabled={testing || saving}>
                {testing ? 'Sending…' : 'Send test webhook'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <AdminBlinkSectionHeader title="Delivery audit" />
      <AdminDataTable
        data={audit}
        columns={columns}
        loading={loading && audit.length === 0}
        getRowId={(row) => row.id}
        emptyMessage="No notification audit events yet."
        totalLabel="events"
        enableGlobalFilter
        globalFilterPlaceholder="Filter by action, user…"
        pageSize={20}
        maxHeight="420px"
        dense
      />
      {auditCursor ? (
        <Button variant="outlined" onClick={() => void loadMoreAudit()}>
          Load more audit
        </Button>
      ) : null}
    </Stack>
  );
}
