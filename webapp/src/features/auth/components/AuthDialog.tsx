'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';
import { Button, Dialog, useGlobalAltchaBusy } from '@/components/ui';
import { AltchaField } from './AltchaField';
import { readAltchaPayload, useOtpFlow } from '../hooks/useOtpFlow';
import type { AuthDialogView } from '@/store/authDialog';
import type { AuthDialogStep as Step } from './authDialogStep';
import { authDialogRenderStep } from './authDialogRender';

/** Avoid deprecated `React.FormEvent` (Sonar S1874); matches what submit handlers use. */
type FormSubmit = { preventDefault(): void; currentTarget: HTMLFormElement };

function seedAuthDialogOnOpen(
  storeTwoFactor: { email: string } | null,
  initialView: AuthDialogView,
  a: {
    setStep: (s: Step) => void;
    setVerifyEmail: (v: string) => void;
    setCode: (v: string) => void;
    setStepBeforeVerify: (s: Step) => void;
    setEmail: (v: string) => void;
    setName: (v: string) => void;
    setSignupEmail: (v: string) => void;
    setResendCooldownSec: (n: number) => void;
    setOtpAttemptsLeft: (n: number | null) => void;
  },
): void {
  if (storeTwoFactor) {
    a.setStep('verify-email');
    a.setVerifyEmail(storeTwoFactor.email);
    a.setCode('');
    a.setStepBeforeVerify('login-email');
    a.setResendCooldownSec(0);
    a.setOtpAttemptsLeft(null);
    return;
  }
  a.setStep(initialView === 'signup' ? 'signup' : 'welcome');
  a.setEmail('');
  a.setName('');
  a.setSignupEmail('');
  a.setCode('');
  a.setVerifyEmail('');
  a.setResendCooldownSec(0);
  a.setOtpAttemptsLeft(null);
}

const authStepTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

// --- Main Component ---

export function AuthDialog() {
  const { isOpen, initialView, close } = useAuthDialogStore();
  const { sendLoginOtp, signUp, verifyCode, verifyTwoFactor, isLoading, twoFactor, resetEphemeralOtpState } =
    useAuth();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const storeTwoFactor = useAuthStore((s) => s.twoFactor);
  const loginFormRef = useRef<HTMLFormElement>(null);
  const signupFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) {
      resetEphemeralOtpState();
    }
  }, [isOpen, resetEphemeralOtpState]);

  useEffect(() => {
    if (isHydrated && isOpen && token) {
      close();
    }
  }, [isHydrated, isOpen, token, close]);
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [stepBeforeVerify, setStepBeforeVerify] = useState<Step>('login-email');
  const prefersReducedMotion = useReducedMotion();

  const {
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
  } = useOtpFlow({
    verifyEmail,
    name,
    stepBeforeVerify,
    sendLoginOtp,
    signUp,
    isLoading,
    twoFactor,
    setCode,
  });

  const goToStep = useCallback((next: Step) => {
    setStep(next);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    seedAuthDialogOnOpen(storeTwoFactor, initialView, {
      setStep,
      setVerifyEmail,
      setCode,
      setStepBeforeVerify,
      setEmail,
      setName,
      setSignupEmail,
      setResendCooldownSec,
      setOtpAttemptsLeft,
    });
  }, [isOpen, initialView, storeTwoFactor, setResendCooldownSec, setOtpAttemptsLeft]);

  const handleSendLoginOtp = async (e: FormSubmit) => {
    e.preventDefault();
    const altcha = altchaOn ? readAltchaPayload(e.currentTarget) : undefined;
    if (altchaOn && !altcha) {
      toast.error('Complete the verification check below.');
      return;
    }
    try {
      await sendLoginOtp(email, altcha);
      setVerifyEmail(email);
      setStepBeforeVerify('login-email');
      setStep('verify-email');
      setResendCooldownSec(60);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send code. Please try again.';
      toast.error(message);
    }
  };

  const handleSignUp = async (e: FormSubmit) => {
    e.preventDefault();
    const altcha = altchaOn ? readAltchaPayload(e.currentTarget) : undefined;
    if (altchaOn && !altcha) {
      toast.error('Complete the verification check below.');
      return;
    }
    try {
      await signUp(name, signupEmail, altcha);
      setVerifyEmail(signupEmail);
      setStepBeforeVerify('signup-email');
      setStep('verify-email');
      setResendCooldownSec(60);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      toast.error(message);
    }
  };

  const handleVerifyCode = async (e: FormSubmit) => {
    e.preventDefault();
    try {
      await verifyCode(verifyEmail, code);
      setOtpAttemptsLeft(null);
      const tf = useAuthStore.getState().twoFactor;
      if (!tf) {
        if (stepBeforeVerify === 'signup' || stepBeforeVerify === 'signup-email') {
          toast.success('Account created successfully.');
        } else {
          toast.success('Signed in successfully.');
        }
        close();
      }
    } catch (err) {
      applyVerifyError(err);
      const message =
        err instanceof Error ? err.message : 'Invalid code. Please try again.';
      toast.error(message);
    }
  };

  const sanitizeOtpInput = (raw: string): string => raw.replaceAll(/\D/g, '').slice(0, 6);

  const handleVerifyTwoFactor = async (e: FormSubmit) => {
    e.preventDefault();
    try {
      await verifyTwoFactor(code);
      toast.success('Signed in successfully.');
      close();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid 2FA code. Please try again.';
      toast.error(message);
    }
  };

  const stepMotionTransition = prefersReducedMotion
    ? { duration: 0 }
    : authStepTransition;

  const twoFactorActive = twoFactor != null;
  const altchaBusy = useGlobalAltchaBusy();

  /** Block dismiss and chrome interaction while OTP step, auth requests, or ALTCHA is running. */
  const blockAuthDialogDismiss =
    altchaBusy ||
    isLoading ||
    (step === 'verify-email' && !twoFactorActive);

  const blockResendDialogDismiss = altchaBusy || isLoading;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={close}
        titleId="auth-dialog-title"
        panelClassName="max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto overscroll-y-contain ss-scrollbar-hide"
        contentClassName="relative overflow-x-hidden p-5 sm:p-6"
        closeOnBackdropClick={!blockAuthDialogDismiss}
        closeOnEscape={!blockAuthDialogDismiss}
        showCloseButton={!blockAuthDialogDismiss}
      >
        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              role="region"
              aria-live="polite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={stepMotionTransition}
            >
              {authDialogRenderStep({
                step,
                goToStep,
                close,
                email,
                setEmail,
                signupEmail,
                setSignupEmail,
                name,
                setName,
                code,
                setCode,
                verifyEmail,
                stepBeforeVerify,
                loginFormRef,
                signupFormRef,
                handleSendLoginOtp,
                handleSignUp,
                handleVerifyCode,
                handleVerifyTwoFactor,
                altchaOn,
                isLoading,
                twoFactorActive,
                otpAttemptsLeft,
                resendCooldownSec,
                onResendCodeClick,
                sanitizeOtpInput,
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </Dialog>

      <Dialog
        open={resendOtpOpen}
        onClose={() => setResendOtpOpen(false)}
        titleId="resend-otp-title"
        panelClassName="max-w-sm border-2 border-border bg-card shadow-[6px_6px_0px_0px_var(--border)]"
        contentClassName="p-5 sm:p-6"
        closeOnBackdropClick={!blockResendDialogDismiss}
        closeOnEscape={!blockResendDialogDismiss}
        showCloseButton={!blockResendDialogDismiss}
      >
        <h3 id="resend-otp-title" className="pr-8 text-sm font-black uppercase tracking-tight text-card-foreground">
          Resend code
        </h3>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground leading-relaxed">
          Complete the quick check — we&apos;ll email a new code to {verifyEmail}.
        </p>
        <form
          ref={resendAltchaFormRef}
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void runResendWithOptionalAltcha();
          }}
        >
          <div className="flex w-full flex-col">
            <AltchaField
              key={resendDialogNonce}
              enabled={altchaOn}
              floating="bottom"
              floatingAnchor="#auth-resend-send-code"
              floatingOffset={8}
            />
            <Button
              id="auth-resend-send-code"
              type="submit"
              className="w-full py-5 text-xs font-black uppercase tracking-widest"
              disabled={isLoading}
            >
              Send new code
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
