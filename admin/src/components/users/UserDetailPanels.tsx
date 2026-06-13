'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Stack, Typography } from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SubscriptionsRoundedIcon from '@mui/icons-material/SubscriptionsRounded';
import type { AdminUserDetail } from '@/admin';
import {
  getUserLedger,
  listAuditLogs,
  type AdminUserLedgerItem,
  type AuditLogRow,
} from '@/admin/api/management';
import { AdminDataTable } from '@/components/ui/AdminDataTable';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { UserDetailEmptySectionCard } from '@/components/users/UserDetailEmptySectionCard';
import { UserDetailStatCard } from '@/components/users/UserDetailStatCard';
import { UserFollowListDialog } from '@/components/users/UserFollowListDialog';
import { UserOAuthBadges } from '@/components/users/UserOAuthBadges';
import { userLedgerColumns } from '@/components/users/userLedgerColumns';
import { emailVerificationDisplay } from '@/lib/users/emailVerificationLabel';
import { formatUserDetailDate } from '@/lib/users/formatUserDetailDate';

type UserPanelContext = {
  token: string | null;
  userRef: string;
};

export function UserOverviewPanel({ user, token, userRef }: { user: AdminUserDetail } & UserPanelContext) {
  const [followDialog, setFollowDialog] = useState<'followers' | 'following' | null>(null);
  const [emailHistory, setEmailHistory] = useState<AuditLogRow[]>([]);
  const emailDisplay = emailVerificationDisplay(user);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await listAuditLogs(token, { userId: user.id, limit: 50 });
        if (cancelled) return;
        setEmailHistory(
          data.items.filter((row) => row.action === 'auth.email.change').slice(0, 10)
        );
      } catch {
        if (!cancelled) setEmailHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user.id]);

  const emailTimeline = useMemo(() => {
    const sorted = [...emailHistory].sort(
      (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
    );
    return sorted.map((row, index) => {
      const newEmail = String(row.metadata?.newEmail ?? '—');
      const older = sorted[index + 1];
      const previousEmail = older ? String(older.metadata?.newEmail ?? '—') : null;
      return { id: row.id, newEmail, previousEmail, at: row.timestamp };
    });
  }, [emailHistory]);

  return (
    <>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Last login"
              value={formatUserDetailDate(user.lastLoginAt)}
              icon={<LoginRoundedIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Joined"
              value={formatUserDetailDate(user.createdAt)}
              icon={<CalendarMonthRoundedIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Followers"
              value={user.followersCount.toLocaleString()}
              icon={<GroupRoundedIcon />}
              onClick={() => setFollowDialog('followers')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Following"
              value={user.followingCount.toLocaleString()}
              icon={<GroupRoundedIcon />}
              onClick={() => setFollowDialog('following')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Profile version"
              value={String(user.profileVersion)}
              icon={<FingerprintRoundedIcon />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <UserDetailStatCard
              label="Stripe customer"
              value={user.stripeCustomerId ?? '—'}
              icon={<CreditCardRoundedIcon />}
              mono={Boolean(user.stripeCustomerId)}
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Email
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <UserDetailEmptySectionCard
                title="Current email"
                icon={<MarkEmailReadRoundedIcon />}
                emptyMessage="No email on file."
              >
                <Stack spacing={0.75}>
                  <Typography variant="body2" fontWeight={700}>
                    {user.email}
                  </Typography>
                  <AdminStatusBadge
                    label={emailDisplay.label}
                    tone={emailDisplay.verified ? 'success' : 'warning'}
                    emphasis={emailDisplay.verified}
                  />
                </Stack>
              </UserDetailEmptySectionCard>
            </Grid>
            {emailTimeline.map((entry) => (
              <Grid key={entry.id} size={{ xs: 12, md: 6 }}>
                <UserDetailEmptySectionCard title="Email change" icon={<MarkEmailReadRoundedIcon />}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={700}>
                      {entry.newEmail}
                    </Typography>
                    {entry.previousEmail ? (
                      <Typography variant="caption" color="text.secondary">
                        Previous: {entry.previousEmail}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" color="text.secondary">
                      {entry.at ? formatUserDetailDate(entry.at) : '—'}
                    </Typography>
                  </Stack>
                </UserDetailEmptySectionCard>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>

      {followDialog ? (
        <UserFollowListDialog
          open
          onClose={() => setFollowDialog(null)}
          token={token}
          userRef={userRef}
          type={followDialog}
        />
      ) : null}
    </>
  );
}

export function UserConnectedAccountsPanel({ user }: { user: AdminUserDetail }) {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <UserOAuthBadges oauth={user.oauth} />
    </Box>
  );
}

function subscriptionStatusTone(status: string | null): 'success' | 'warning' | 'neutral' {
  if (!status) return 'neutral';
  const s = status.toLowerCase();
  if (s === 'active' || s === 'trialing') return 'success';
  if (s === 'past_due' || s === 'unpaid') return 'warning';
  return 'neutral';
}

export function UserBillingPanel({
  user,
  token,
  userRef,
}: { user: AdminUserDetail } & UserPanelContext) {
  const [ledger, setLedger] = useState<AdminUserLedgerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserLedger(token, userRef);
      setLedger(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [token, userRef]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const sub = user.billing.subscription;

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserDetailStatCard
            label="Plan"
            value={
              user.subscriptionPlanKey ? (
                <AdminStatusBadge label={user.subscriptionPlanKey} tone="primary" emphasis />
              ) : (
                '—'
              )
            }
            icon={<SubscriptionsRoundedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserDetailStatCard
            label="Status"
            value={
              user.subscriptionStatus ? (
                <AdminStatusBadge
                  label={user.subscriptionStatus}
                  tone={subscriptionStatusTone(user.subscriptionStatus)}
                  emphasis
                />
              ) : (
                '—'
              )
            }
            icon={<PaymentsRoundedIcon />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <UserDetailStatCard
            label="Ledger entries"
            value={user.billing.ledgerEntryCount.toLocaleString()}
            icon={<ReceiptLongRoundedIcon />}
          />
        </Grid>
        {sub ? (
          <>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <UserDetailStatCard
                label="Current period ends"
                value={formatUserDetailDate(sub.currentPeriodEnd)}
                icon={<EventRepeatRoundedIcon />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <UserDetailStatCard
                label="Cancel at period end"
                value={sub.cancelAtPeriodEnd ? 'Yes' : 'No'}
                icon={<CalendarMonthRoundedIcon />}
              />
            </Grid>
          </>
        ) : (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              No active subscription record.
            </Typography>
          </Grid>
        )}
      </Grid>

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Transactions
        </Typography>
        {error ? (
          <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
        ) : null}
        <AdminDataTable
          data={ledger}
          columns={userLedgerColumns}
          loading={loading}
          emptyMessage="No transactions yet."
          enablePagination
          pageSize={10}
          dense
        />
      </Box>
    </Stack>
  );
}

export { UserContentPanel } from '@/components/users/UserContentPanel';
