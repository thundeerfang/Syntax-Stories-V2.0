'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { AdminOtpInput } from '@/components/ui/AdminOtpInput';
import Image from 'next/image';
import { apiUrl } from '@/lib/api';
import { adminFetchCredentials } from '@/lib/auth/adminFetchDefaults';
import { fetchManagementMe } from '@/admin/api/management';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';

type SetupPayload = {
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
};

export function TwoFactorSetupFlow() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const setManagementContext = useSessionStore((s) => s.setManagementContext);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoStarted = useRef(false);

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {};
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(apiUrl('/auth/2fa/setup'), {
        method: 'POST',
        credentials: adminFetchCredentials(),
        headers,
      });
      const json = (await res.json()) as SetupPayload & { success?: boolean; message?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Failed to start 2FA setup');
      }
      setSetup(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }, [apiToken]);

  async function enable(submittedCode?: string) {
    const totp = (submittedCode ?? code).replace(/\D/g, '').slice(0, 6);
    if (totp.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
      const res = await fetch(apiUrl('/auth/2fa/enable'), {
        method: 'POST',
        credentials: adminFetchCredentials(),
        headers,
        body: JSON.stringify({ token: totp }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Invalid code');
      }
      const me = await fetchManagementMe(apiToken);
      setManagementContext(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enable failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoStarted.current || setup) return;
    autoStarted.current = true;
    void startSetup();
  }, [setup, startSetup]);

  return (
    <Box
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-4"
      sx={{ maxWidth: 420, mx: 'auto', bgcolor: 'background.default' }}
    >
      <Typography variant="h5" fontWeight={800} align="center">
        Set up two-factor authentication
      </Typography>
      <Alert severity="warning" sx={{ width: '100%' }}>
        This is required on first login. Scan the QR code below — you cannot access the dashboard
        until 2FA is enabled.
      </Alert>

      {error ? (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      ) : null}

      {!setup ? (
        <Button variant="contained" onClick={() => void startSetup()} disabled={loading}>
          {loading ? 'Loading QR code…' : 'Show QR code'}
        </Button>
      ) : (
        <Stack spacing={2} alignItems="center" sx={{ width: '100%' }}>
          {setup.qrCodeDataUrl ? (
            <Image
              src={setup.qrCodeDataUrl}
              alt="2FA QR code"
              width={200}
              height={200}
              unoptimized
            />
          ) : null}
          <Typography variant="body2" color="text.secondary" align="center">
            Scan the QR code with your authenticator app, then enter the 6-digit code.
          </Typography>
          <AdminOtpInput
            value={code}
            onChange={setCode}
            onComplete={(completed) => {
              if (!loading) void enable(completed);
            }}
            disabled={loading}
            autoFocus
            aria-label="Verification code"
          />
          <Button
            variant="contained"
            fullWidth
            disabled={loading || code.length < 6}
            onClick={() => void enable()}
          >
            Enable 2FA
          </Button>
        </Stack>
      )}
    </Box>
  );
}
