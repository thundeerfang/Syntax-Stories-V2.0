'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getAltchaChallengeUrl, AuthError } from '@/api/auth';

export function readAltchaPayload(form: HTMLFormElement | null): string | undefined {
  if (!form) return undefined;
  const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="altcha"]');
  const v = el?.value?.trim();
  return v || undefined;
}

/** Value of `step` before opening the email OTP screen (resend uses this to pick login vs signup). */
export type OtpFlowStepBeforeVerify =
  | 'welcome'
  | 'login-email'
  | 'signup'
  | 'signup-email'
  | 'verify-email';

export function useOtpFlow(params: {
  verifyEmail: string;
  name: string;
  stepBeforeVerify: OtpFlowStepBeforeVerify;
  sendLoginOtp: (email: string, altcha?: string) => Promise<void>;
  signUp: (name: string, email: string, altcha?: string) => Promise<void>;
  isLoading: boolean;
  twoFactor: { challengeToken: string; email: string } | null;
  setCode: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { verifyEmail, name, stepBeforeVerify, sendLoginOtp, signUp, isLoading, twoFactor, setCode } =
    params;

  const resendAltchaFormRef = useRef<HTMLFormElement>(null);
  const altchaOn = !!getAltchaChallengeUrl();
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState<number | null>(null);
  const [resendOtpOpen, setResendOtpOpen] = useState(false);
  const [resendDialogNonce, setResendDialogNonce] = useState(0);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);

  useEffect(() => {
    if (resendCooldownSec <= 0) return;
    const t = setTimeout(() => setResendCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldownSec]);

  const applyVerifyError = useCallback((err: unknown) => {
    if (err instanceof AuthError && err.extras?.attemptsLeft != null) {
      setOtpAttemptsLeft(err.extras.attemptsLeft);
    } else {
      setOtpAttemptsLeft(null);
    }
  }, []);

  const runResendWithOptionalAltcha = useCallback(
    async (altcha?: string) => {
      if (resendCooldownSec > 0 || isLoading || twoFactor) return;
      const resolved =
        altcha ?? (altchaOn ? readAltchaPayload(resendAltchaFormRef.current) : undefined);
      if (altchaOn && !resolved) {
        toast.error('Complete the verification check.');
        return;
      }
      try {
        if (stepBeforeVerify === 'login-email') {
          await sendLoginOtp(verifyEmail, resolved);
        } else {
          await signUp(name, verifyEmail, resolved);
        }
        setCode('');
        setResendCooldownSec(60);
        setOtpAttemptsLeft(null);
        setResendOtpOpen(false);
        toast.success('A new code was sent to your email.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not resend code.');
      }
    },
    [
      altchaOn,
      isLoading,
      twoFactor,
      resendCooldownSec,
      stepBeforeVerify,
      sendLoginOtp,
      signUp,
      verifyEmail,
      name,
      setCode,
    ]
  );

  const onResendCodeClick = useCallback(() => {
    if (resendCooldownSec > 0 || isLoading || twoFactor) return;
    if (altchaOn) {
      setResendDialogNonce((n) => n + 1);
      setResendOtpOpen(true);
    } else {
      void runResendWithOptionalAltcha();
    }
  }, [altchaOn, isLoading, twoFactor, resendCooldownSec, runResendWithOptionalAltcha]);

  return {
    altchaOn,
    resendAltchaFormRef,
    otpAttemptsLeft,
    setOtpAttemptsLeft,
    resendOtpOpen,
    setResendOtpOpen,
    resendDialogNonce,
    resendCooldownSec,
    setResendCooldownSec,
    runResendWithOptionalAltcha,
    onResendCodeClick,
    applyVerifyError,
  };
}
