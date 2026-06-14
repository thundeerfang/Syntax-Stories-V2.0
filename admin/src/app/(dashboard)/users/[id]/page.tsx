'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PhonelinkLockRoundedIcon from '@mui/icons-material/PhonelinkLockRounded';
import {
  fetchManagementMe,
  getUser,
  postLockUser,
  postRevokeSessions,
  postUnlockUser,
  startImpersonation,
  type AdminUserDetail,
} from '@/admin';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { nestedPageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { AdminTabs } from '@/components/ui/AdminTabs';
import { UserAccountActionsCard } from '@/components/users/UserAccountActionsCard';
import {
  UserBillingPanel,
  UserConnectedAccountsPanel,
  UserContentPanel,
  UserOverviewPanel,
} from '@/components/users/UserDetailPanels';
import { UserAuditPanel } from '@/components/users/UserAuditPanel';
import { UserProfilePanel } from '@/components/users/UserProfilePanel';
import { emailVerificationDisplay } from '@/lib/users/emailVerificationLabel';
import { normalizeUserRef } from '@/lib/users/normalizeUserRef';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';
import { isLikelyObjectId, userProfilePath } from '@/lib/users/userProfilePath';
import { useSessionStore } from '@/store/session';

const TAB_KEYS = ['overview', 'profile', 'connected', 'billing', 'content', 'audit'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const USER_DETAIL_TABS = [
  { label: 'Overview', icon: PersonRoundedIcon },
  { label: 'Profile', icon: BadgeRoundedIcon },
  { label: 'Connected Accounts', icon: LinkRoundedIcon },
  { label: 'Billing', icon: PaymentsRoundedIcon },
  { label: 'Content', icon: ArticleRoundedIcon },
  { label: 'Audit', icon: HistoryRoundedIcon },
] as const;

function tabFromQuery(raw: string | null): TabKey {
  if (raw === 'profile' || raw === 'connected' || raw === 'billing' || raw === 'content' || raw === 'audit') {
    return raw;
  }
  return 'overview';
}

function firstNameFromFullName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return trimmed;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function UserDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeRef =
    typeof params.id === 'string' ? normalizeUserRef(params.id) : '';
  const [tab, setTab] = useState<TabKey>(() => tabFromQuery(searchParams.get('tab')));

  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const setManagementContext = useSessionStore((s) => s.setManagementContext);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab(tabFromQuery(searchParams.get('tab')));
  }, [searchParams]);

  const setTabAndUrl = useCallback(
    (next: TabKey) => {
      setTab(next);
      const q = next === 'overview' ? '' : `?tab=${next}`;
      router.replace(`${pathname ?? '/users'}${q}`, { scroll: false });
    },
    [router, pathname]
  );

  const refresh = useCallback(async () => {
    if ((!apiToken && !httpOnlyCookies) || !routeRef) return;
    setError(null);
    try {
      const r = await getUser(apiToken, routeRef);
      setUser(r.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user');
    }
  }, [apiToken, httpOnlyCookies, routeRef]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.ref || !routeRef) return;
    if (isLikelyObjectId(routeRef)) {
      router.replace(userProfilePath(user.ref, tab), { scroll: false });
    }
  }, [user, routeRef, router, tab]);

  async function onImpersonate() {
    if ((!apiToken && !httpOnlyCookies) || !user) return;
    if (user.staffRole) {
      setError('Cannot impersonate staff accounts');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await startImpersonation(apiToken, user.ref);
      const me = await fetchManagementMe(apiToken);
      setManagementContext(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impersonation failed');
    } finally {
      setBusy(false);
    }
  }

  async function run(action: 'lock' | 'unlock' | 'revoke') {
    if ((!apiToken && !httpOnlyCookies) || !user) return;
    setBusy(true);
    setError(null);
    try {
      if (action === 'lock') await postLockUser(apiToken, user.ref);
      if (action === 'unlock') await postUnlockUser(apiToken, user.ref);
      if (action === 'revoke') await postRevokeSessions(apiToken, user.ref);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!routeRef) return null;

  const tabIndex = TAB_KEYS.indexOf(tab);
  const emailDisplay = user ? emailVerificationDisplay(user) : null;

  return (
    <Stack spacing={3}>
      {error ? (
        <AdminFeedbackMessage severity="error" message={error} onClose={() => setError(null)} />
      ) : null}

      {!user ? (
        <Typography color="text.secondary">Loading…</Typography>
      ) : (
        <>
          <CentricPageHeader
            title={firstNameFromFullName(user.fullName)}
            description={`@${user.username} · ${user.email}`}
            breadcrumbs={nestedPageBreadcrumbs(
              { label: 'Users', href: '/users' },
              user.fullName
            )}
            avatar={{
              src: resolveProfileMediaUrl(user.profileImg, user.username),
              alt: user.fullName,
              fallbackLetter: user.fullName,
            }}
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <AdminStatusBadge
              label={user.isActive ? 'Active' : 'Login locked'}
              tone={user.isActive ? 'success' : 'warning'}
              emphasis={user.isActive}
              icon={
                user.isActive ? (
                  <CheckCircleRoundedIcon fontSize="inherit" />
                ) : (
                  <LockRoundedIcon fontSize="inherit" />
                )
              }
            />
            {emailDisplay ? (
              <AdminStatusBadge
                label={emailDisplay.label}
                tone={emailDisplay.verified ? 'success' : 'warning'}
                emphasis={emailDisplay.verified}
                icon={
                  emailDisplay.verified ? (
                    <MarkEmailReadRoundedIcon fontSize="inherit" />
                  ) : (
                    <MarkEmailUnreadRoundedIcon fontSize="inherit" />
                  )
                }
              />
            ) : null}
            {user.twoFactorEnabled ? (
              <AdminStatusBadge
                label="2FA enabled"
                tone="info"
                emphasis
                icon={<PhonelinkLockRoundedIcon fontSize="inherit" />}
              />
            ) : null}
            <AdminStatusBadge
              label={
                (user.accountType ?? (user.staffRole ? 'staff' : 'platform')) === 'staff'
                  ? `Staff: ${user.staffRole ?? 'yes'}`
                  : 'Platform user'
              }
              tone={
                (user.accountType ?? (user.staffRole ? 'staff' : 'platform')) === 'staff'
                  ? 'primary'
                  : 'neutral'
              }
              emphasis={(user.accountType ?? (user.staffRole ? 'staff' : 'platform')) === 'staff'}
              icon={<AdminPanelSettingsRoundedIcon fontSize="inherit" />}
            />
          </Stack>

          <Grid container spacing={3} alignItems="flex-start">
            <Grid size={{ xs: 12, lg: 8 }}>
              <AdminTabs
                tabs={[...USER_DETAIL_TABS]}
                value={tabIndex >= 0 ? tabIndex : 0}
                onChange={(v) => setTabAndUrl(TAB_KEYS[v] ?? 'overview')}
              >
                {tab === 'overview' ? (
                  <UserOverviewPanel user={user} token={apiToken} userRef={user.ref} />
                ) : null}
                {tab === 'profile' ? <UserProfilePanel user={user} /> : null}
                {tab === 'connected' ? <UserConnectedAccountsPanel user={user} /> : null}
                {tab === 'billing' ? (
                  <UserBillingPanel user={user} token={apiToken} userRef={user.ref} />
                ) : null}
                {tab === 'content' ? <UserContentPanel user={user} /> : null}
                {tab === 'audit' ? <UserAuditPanel user={user} token={apiToken} /> : null}
              </AdminTabs>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <UserAccountActionsCard
                user={user}
                busy={busy}
                canImpersonate={hasPermission('user:impersonate')}
                onLock={() => void run('lock')}
                onUnlock={() => void run('unlock')}
                onRevoke={() => void run('revoke')}
                onImpersonate={() => void onImpersonate()}
              />
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  );
}

export default function UserDetailPage() {
  return (
    <Suspense
      fallback={
        <Stack spacing={3} sx={{ py: 4 }}>
          <Typography color="text.secondary">Loading…</Typography>
        </Stack>
      }
    >
      <UserDetailPageInner />
    </Suspense>
  );
}
