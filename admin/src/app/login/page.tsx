'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { apiUrl, fetchMe, getApiOrigin } from '@/lib/api';
import { AdminOtpInput } from '@/components/ui/AdminOtpInput';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { fetchManagementMe } from '@/admin/api/management';
import { useSessionStore } from '@/store/session';
import { AdminAuthPageLayout } from '@/components/auth/AdminAuthPageLayout';
import { AdminAuthShell } from '@/components/auth/AdminAuthShell';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const setManagementContext = useSessionStore((s) => s.setManagementContext);
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [twoFactorSetupRequired, setTwoFactorSetupRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiConfigured = typeof window !== 'undefined' ? Boolean(getApiOrigin()) : true;

  useEffect(() => {
    if (!hydrated || !isAdminAuthActive(token, httpOnlyCookies)) return;
    let cancelled = false;
    void fetchMe(resolveAdminApiToken(token, httpOnlyCookies))
      .then((me) => {
        if (cancelled) return;
        const role = me.user.staffRole;
        if (role === 'editor' || role === 'admin') {
          router.replace('/');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hydrated, token, httpOnlyCookies, router]);

  async function completeStaffSession(
    accessToken: string,
    refreshToken: string | null,
    tokensInCookies?: boolean
  ) {
    if (tokensInCookies) {
      useSessionStore.setState({ httpOnlyCookies: true, token: null, refreshToken: null });
    } else {
      setSession(accessToken, refreshToken);
    }
    const me = await fetchMe(tokensInCookies ? null : accessToken);
    const role = me.user.staffRole;
    if (role !== 'editor' && role !== 'admin') {
      useSessionStore.getState().logout();
      setError('This account does not have CMS access.');
      return;
    }
    try {
      const mgmt = await fetchManagementMe(tokensInCookies ? null : accessToken);
      setManagementContext(mgmt);
    } catch {
      /* nav falls back to staff-only items until /me succeeds */
    }
    router.replace('/');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!getApiOrigin()) {
      setError('Set NEXT_PUBLIC_API_BASE_URL in .env.local (e.g. http://localhost:7373).');
      return;
    }

    if (challengeToken) {
      setLoading(true);
      try {
        const res = await fetch(apiUrl('/auth/2fa/verify-login'), {
          method: 'POST',
          credentials: adminFetchCredentials(),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeToken,
            token: twoFactorCode.replace(/\D/g, '').slice(0, 6),
          }),
        });
        const json = (await res.json()) as {
          success?: boolean;
          accessToken?: string;
          refreshToken?: string;
          tokensInCookies?: boolean;
          message?: string;
        };
        if (!res.ok || (!json.accessToken && !json.tokensInCookies)) {
          setError(json.message ?? 'Invalid authenticator code');
          return;
        }
        await completeStaffSession(
          json.accessToken ?? '',
          json.refreshToken ?? null,
          json.tokensInCookies
        );
      } catch {
        setError('Network error — is the API running?');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/staff-login'), {
        method: 'POST',
        credentials: adminFetchCredentials(),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        accessToken?: string;
        refreshToken?: string;
        message?: string;
        twoFactorRequired?: boolean;
        challengeToken?: string;
        twoFactorSetupRequired?: boolean;
        tokensInCookies?: boolean;
      };
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Sign-in failed');
        return;
      }
      if (json.twoFactorRequired && json.challengeToken) {
        setChallengeToken(json.challengeToken);
        setError(null);
        return;
      }
      if (json.twoFactorSetupRequired && (json.accessToken || json.tokensInCookies)) {
        setTwoFactorSetupRequired(true);
        await completeStaffSession(
          json.accessToken ?? '',
          json.refreshToken ?? null,
          json.tokensInCookies
        );
        return;
      }
      if (!json.accessToken && !json.tokensInCookies) {
        setError('Sign-in failed');
        return;
      }
      await completeStaffSession(
        json.accessToken ?? '',
        json.refreshToken ?? null,
        json.tokensInCookies
      );
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminAuthPageLayout>
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
        <AdminAuthShell
          title="Syntax Stories Admin"
          subtitle={
            challengeToken
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Staff sign-in with email and password. Operators must use two-factor authentication.'
          }
          icon={<LockOutlinedIcon sx={{ fontSize: 28 }} />}
        >
          {!apiConfigured && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Set <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env.local</code>.
            </Alert>
          )}

          {twoFactorSetupRequired ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Complete authenticator setup from account settings after your first sign-in.
            </Alert>
          ) : null}

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              {!challengeToken ? (
                <>
                  <TextField
                    label="Work email"
                    type="email"
                    required
                    fullWidth
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    label="Password"
                    type="password"
                    required
                    fullWidth
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </>
              ) : (
                <AdminOtpInput
                  value={twoFactorCode}
                  onChange={setTwoFactorCode}
                  disabled={loading}
                  autoFocus
                  error={Boolean(error)}
                  aria-label="Authenticator code"
                />
              )}
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ py: 1.2, mt: 0.5 }}
              >
                {loading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : challengeToken ? (
                  'Verify & sign in'
                ) : (
                  'Sign in'
                )}
              </Button>
              {challengeToken ? (
                <Button
                  type="button"
                  variant="text"
                  size="small"
                  onClick={() => {
                    setChallengeToken(null);
                    setTwoFactorCode('');
                  }}
                >
                  Use a different account
                </Button>
              ) : null}
            </Stack>
          </Box>
        </AdminAuthShell>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 3, display: 'block', textAlign: 'center' }}
        >
          Protected area · staff and operators only
        </Typography>
      </Container>
    </AdminAuthPageLayout>
  );
}
