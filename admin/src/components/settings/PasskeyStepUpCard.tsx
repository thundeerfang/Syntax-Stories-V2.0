'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded';
import {
  fetchPasskeyStatus,
  getPreferPasskeyStepUp,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  removePasskey,
  setPasskeyStepUpPreference,
  setPreferPasskeyStepUp,
  type PasskeyStatus,
} from '@/lib/auth/passkeyStepUp';
import { resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { SecuritySectionCard } from '@/components/settings/SecuritySectionCard';
import { AdminStatusBadge } from '@/components/ui/AdminStatusBadge';
import { useSessionStore } from '@/store/session';

export function PasskeyStepUpCard() {
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const passkeyFeature = useSessionStore((s) => s.passkeyStepUpFeature);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);

  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [status, setStatus] = useState<PasskeyStatus | null>(null);
  const [preferAuto, setPreferAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiToken && !httpOnlyCookies) return;
    setError(null);
    try {
      const [platform, st] = await Promise.all([
        isPlatformAuthenticatorAvailable(),
        fetchPasskeyStatus(apiToken),
      ]);
      setPlatformAvailable(platform);
      setStatus(st);
      setPreferAuto(getPreferPasskeyStepUp());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load passkey settings');
    }
  }, [apiToken, httpOnlyCookies]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!passkeyFeature) return null;

  async function onRegister() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const label =
        typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
          ? 'MacBook Touch ID'
          : 'This laptop';
      await registerPasskey(apiToken, label);
      setMessage('Passkey registered. You can unlock step-up with Touch ID when idle.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleStepUp(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setPasskeyStepUpPreference(apiToken, enabled);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await removePasskey(apiToken);
      setPreferPasskeyStepUp(false);
      setPreferAuto(false);
      setMessage('Passkey removed.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SecuritySectionCard
      icon={FingerprintRoundedIcon}
      title="Touch ID / biometric unlock"
      subtitle="Use your device fingerprint instead of typing a 2FA code when step-up is required"
      action={
        status?.registered ? (
          <AdminStatusBadge
            label={`${status.count} registered`}
            tone="success"
            emphasis
            icon={<FingerprintRoundedIcon fontSize="inherit" />}
          />
        ) : (
          <AdminStatusBadge label="Not set up" tone="neutral" />
        )
      }
    >
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      {message ? <Alert severity="success" sx={{ mb: 1.5 }}>{message}</Alert> : null}

      {!platformAvailable ? (
        <Alert severity="info" sx={{ mb: status?.registered ? 1.5 : 0 }}>
          This browser does not report a platform authenticator (Touch ID / Windows Hello). Use
          Safari or Chrome on a supported laptop.
        </Alert>
      ) : null}

      {status?.registered ? (
        <Stack spacing={1.5}>
          {status.devices?.[0]?.deviceLabel ? (
            <Typography variant="body2" color="text.secondary">
              Primary device: <strong>{status.devices[0].deviceLabel}</strong>
            </Typography>
          ) : null}
          <FormControlLabel
            control={
              <Switch
                checked={status.stepUpEnabled}
                onChange={(_, v) => void onToggleStepUp(v)}
                disabled={busy}
              />
            }
            label="Use Touch ID for step-up instead of typing a code"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferAuto}
                onChange={(_, v) => {
                  setPreferAuto(v);
                  setPreferPasskeyStepUp(v);
                }}
                disabled={busy || !status.stepUpEnabled}
              />
            }
            label="Prompt Touch ID automatically when step-up is required"
          />
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<FingerprintRoundedIcon />}
            onClick={() => void onRemove()}
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
          >
            Remove passkey
          </Button>
        </Stack>
      ) : (
        <Button
          variant="contained"
          startIcon={<FingerprintRoundedIcon />}
          onClick={() => void onRegister()}
          disabled={busy || !platformAvailable}
          sx={{ alignSelf: 'flex-start' }}
        >
          Set up Touch ID for this device
        </Button>
      )}
    </SecuritySectionCard>
  );
}
