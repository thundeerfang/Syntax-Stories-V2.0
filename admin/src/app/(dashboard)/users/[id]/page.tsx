'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  getUser,
  postLockUser,
  postRevokeSessions,
  postUnlockUser,
  type AdminUserDetail,
} from '@/admin';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { useSessionStore } from '@/store/session';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const token = useSessionStore((s) => s.token);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !id) return;
    setError(null);
    try {
      const r = await getUser(token, id);
      setUser(r.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user');
    }
  }, [token, id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: 'lock' | 'unlock' | 'revoke') {
    if (!token || !id) return;
    setBusy(true);
    setError(null);
    try {
      if (action === 'lock') await postLockUser(token, id);
      if (action === 'unlock') await postUnlockUser(token, id);
      if (action === 'revoke') await postRevokeSessions(token, id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!id) return null;

  return (
    <Stack spacing={3}>
      <Breadcrumbs>
        <Link href="/users" className="text-inherit underline-offset-4 hover:underline">
          Users
        </Link>
        <Typography color="text.primary">Profile</Typography>
      </Breadcrumbs>

      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}

      {!user ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : (
        <>
          <DashboardPageHeader
            title={user.fullName}
            subtitle={`@${user.username} · ${user.email}`}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={user.isActive ? 'Active' : 'Login locked'}
              color={user.isActive ? 'success' : 'default'}
              variant="outlined"
            />
            <Chip
              label={user.emailVerified ? 'Email verified' : 'Email unverified'}
              variant="outlined"
            />
            {user.staffRole && <Chip label={`Staff: ${user.staffRole}`} color="primary" variant="outlined" />}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              color="warning"
              disabled={busy || !user.isActive}
              onClick={() => void run('lock')}
            >
              Lock account
            </Button>
            <Button
              variant="outlined"
              disabled={busy || user.isActive}
              onClick={() => void run('unlock')}
            >
              Unlock account
            </Button>
            <Button variant="outlined" color="secondary" disabled={busy} onClick={() => void run('revoke')}>
              Revoke all sessions
            </Button>
            <Button variant="text" onClick={() => router.push('/users')}>
              Back to list
            </Button>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', flex: 1 }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Billing snapshot
                </Typography>
                <Typography variant="body2">
                  Plan: {user.subscriptionPlanKey ?? '—'} · Status: {user.subscriptionStatus ?? '—'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Ledger entries: {user.billing.ledgerEntryCount}
                </Typography>
                {user.billing.subscription && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                    Period end: {user.billing.subscription.currentPeriodEnd ?? '—'} · Cancel at period end:{' '}
                    {user.billing.subscription.cancelAtPeriodEnd ? 'yes' : 'no'}
                  </Typography>
                )}
              </CardContent>
            </Card>
            <Card
              elevation={0}
              className="border border-[var(--color-border)]"
              sx={{ borderColor: 'divider', flex: 1 }}
            >
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Content
                </Typography>
                <Typography variant="body2">
                  Published posts: {user.blog.published} · Drafts: {user.blog.drafts}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  OAuth flags
                </Typography>
                <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {JSON.stringify(user.oauth, null, 2)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </>
      )}
    </Stack>
  );
}
