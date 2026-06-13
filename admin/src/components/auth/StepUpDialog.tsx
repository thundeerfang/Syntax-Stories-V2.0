'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminOtpInput } from '@/components/ui/AdminOtpInput';
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded';
import PhonelinkLockRoundedIcon from '@mui/icons-material/PhonelinkLockRounded';
import { AdminDialog } from '@/components/ui/AdminDialog';
import {
  fetchPasskeyStatus,
  getPreferPasskeyStepUp,
  isPlatformAuthenticatorAvailable,
  submitStepUpPasskey,
} from '@/lib/auth/passkeyStepUp';
import { submitStepUpTotp } from '@/lib/auth/stepUpAuth';
import { formatSessionCountdown } from '@/lib/auth/adminIdleSession';
import { useSessionCountdown } from '@/lib/auth/useSessionCountdown';
import { useSessionStore } from '@/store/session';

type Props = {
  open: boolean;
  accessToken: string | null;
  onSuccess: () => void;
  onClose: () => void;
};

export function StepUpDialog({ open, accessToken, onSuccess, onClose }: Props) {
  const stepUpGraceDeadlineAt = useSessionStore((s) => s.stepUpGraceDeadlineAt);
  const graceRemainingMs = useSessionCountdown(stepUpGraceDeadlineAt);
  const graceLabel = formatSessionCountdown(graceRemainingMs);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyReady, setPasskeyReady] = useState(false);
  const [showTotp, setShowTotp] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode('');
      setError(null);
      setLoading(false);
      setPasskeyReady(false);
      setShowTotp(false);
      setAutoTried(false);
      return;
    }

    void (async () => {
      try {
        const [platform, status] = await Promise.all([
          isPlatformAuthenticatorAvailable(),
          fetchPasskeyStatus(accessToken),
        ]);
        const canPasskey = platform && status.stepUpEnabled && status.registered;
        setPasskeyReady(canPasskey);
        setShowTotp(!canPasskey);
      } catch {
        setPasskeyReady(false);
        setShowTotp(true);
      }
    })();
  }, [open, accessToken]);

  const runPasskey = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await submitStepUpPasskey(accessToken);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Biometric verification failed');
      setShowTotp(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, onSuccess]);

  useEffect(() => {
    if (!open || !passkeyReady || autoTried || showTotp) return;
    if (!getPreferPasskeyStepUp()) return;
    setAutoTried(true);
    void runPasskey();
  }, [open, passkeyReady, autoTried, showTotp, runPasskey]);

  async function onSubmitTotp(submittedCode?: string) {
    const totp = (submittedCode ?? code).replace(/\D/g, '').slice(0, 6);
    if (totp.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      await submitStepUpTotp(accessToken, totp);
      setCode('');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  const useBiometricPrimary = passkeyReady && !showTotp;

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={useBiometricPrimary ? 'Unlock with Touch ID' : 'Confirm with 2FA'}
      subtitle={
        useBiometricPrimary
          ? `Use your Mac fingerprint or device PIN to continue. Respond within ${graceLabel}.`
          : `Enter your authenticator code, or use Touch ID if configured. Respond within ${graceLabel}.`
      }
      icon={
        useBiometricPrimary ? (
          <FingerprintRoundedIcon sx={{ fontSize: 28 }} />
        ) : (
          <PhonelinkLockRoundedIcon sx={{ fontSize: 28 }} />
        )
      }
      maxWidth="xs"
      footerAlign="center"
      secondaryButton={{ label: 'Cancel', onClick: onClose, disabled: loading }}
      primaryButton={
        useBiometricPrimary
          ? {
              label: 'Use Touch ID',
              onClick: () => void runPasskey(),
              disabled: loading,
              loading,
            }
          : {
              label: 'Verify',
              onClick: () => void onSubmitTotp(),
              disabled: loading || code.length < 6,
              loading,
            }
      }
    >
      {error ? <AdminFeedbackMessage severity="error" message={error} sx={{ mb: 2 }} /> : null}

      <Typography
        variant="caption"
        color="warning.main"
        fontWeight={600}
        sx={{ display: 'block', textAlign: 'center', mb: 2, fontFamily: 'ui-monospace, monospace' }}
      >
        Time remaining: {graceLabel}
      </Typography>

      {useBiometricPrimary ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <FingerprintRoundedIcon sx={{ fontSize: 56, color: 'primary.main', opacity: 0.9 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Your session was idle. Confirm it is you without typing a code.
          </Typography>
          <Button
            size="small"
            sx={{ mt: 2 }}
            onClick={() => setShowTotp(true)}
            disabled={loading}
          >
            Use authenticator app instead
          </Button>
        </Box>
      ) : (
        <>
          {passkeyReady ? (
            <>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FingerprintRoundedIcon />}
                onClick={() => void runPasskey()}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                Use Touch ID
              </Button>
              <Divider sx={{ mb: 2 }}>or enter code</Divider>
            </>
          ) : null}
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
            <AdminOtpInput
              value={code}
              onChange={setCode}
              onComplete={(completed) => {
                if (!loading) void onSubmitTotp(completed);
              }}
              disabled={loading}
              autoFocus={!passkeyReady}
              error={Boolean(error)}
              aria-label="Authenticator code"
            />
          </Box>
        </>
      )}
    </AdminDialog>
  );
}
