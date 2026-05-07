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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { apiUrl, fetchMe, getApiOrigin } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);
  const token = useSessionStore((s) => s.token);
  const hydrated = useSessionStore((s) => s.hydrated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiConfigured = typeof window !== 'undefined' ? Boolean(getApiOrigin()) : true;

  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    void fetchMe(token)
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
  }, [hydrated, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!getApiOrigin()) {
      setError(
        'API URL is not configured. Set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:7373).'
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/auth/staff-login'), {
        method: 'POST',
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
      };
      if (!res.ok || !json.accessToken) {
        setError(json.message ?? 'Sign-in failed');
        return;
      }
      setSession(json.accessToken, json.refreshToken ?? null);
      const me = await fetchMe(json.accessToken);
      const role = me.user.staffRole;
      if (role !== 'editor' && role !== 'admin') {
        setSession(null, null);
        setError('This account does not have CMS access.');
        return;
      }
      router.replace('/');
    } catch {
      setError('Network error — is the API running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      className="relative min-h-screen overflow-hidden"
      sx={{
        background: (theme) =>
          `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.dark, 0.06)} 45%, #fafafa 100%)`,
      }}
    >
      <Box
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full blur-3xl"
        sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.15) }}
      />
      <Box
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl"
        sx={{ bgcolor: (t) => alpha(t.palette.primary.light, 0.2) }}
      />

      <Container maxWidth="sm" className="relative flex min-h-screen flex-col justify-center py-10">
        <Paper
          elevation={0}
          className="overflow-hidden border border-[var(--color-border)] shadow-lg shadow-zinc-900/5"
          sx={{
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box
            className="px-6 pb-2 pt-8 text-center sm:px-10"
            sx={{
              background: (theme) =>
                `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 100%)`,
            }}
          >
            <Box
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" component="h1" fontWeight={800} className="tracking-tight">
              Syntax Stories Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mx-auto mt-2 max-w-sm">
              Sign in with your staff account. Sessions are stored in this browser only.
            </Typography>
          </Box>

          <Box className="px-6 pb-8 pt-4 sm:px-10">
            {!apiConfigured && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Set <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env.local</code>. Dev default is{' '}
                <code>http://localhost:7373</code>.
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="medium"
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
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.25, mt: 1 }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Paper>

        <Typography variant="caption" color="text.secondary" className="mt-8 block text-center">
          Protected area · staff roles only
        </Typography>
      </Container>
    </Box>
  );
}
