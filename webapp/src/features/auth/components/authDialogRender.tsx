'use client';

import type { RefObject, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Mail, ArrowLeft, HelpCircle } from 'lucide-react';
import {
  GoogleIcon,
  GithubIcon,
  FacebookIcon,
  XIcon,
  ICON_DISCORD,
} from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/utils';
import { markOAuthNavigationPending } from '@/lib/oauthNavigation';
import { AltchaField } from './AltchaField';
import type { AuthDialogStep } from './authDialogStep';

const TERMS_LINK = '/terms';
const PRIVACY_LINK = '/privacy';
const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

type FormSubmit = { preventDefault(): void; currentTarget: HTMLFormElement };

function SocialButton({
  icon: Icon,
  iconSrc,
  iconClassName,
  label,
  href,
  onBeforeNavigate,
}: Readonly<{
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  iconClassName?: string;
  label: string;
  href?: string;
  onBeforeNavigate?: () => void;
}>) {
  let iconEl: React.ReactNode = null;
  if (iconSrc != null) {
    iconEl = (
      <img src={iconSrc} alt="" className={cn('h-5 w-5 shrink-0 object-contain', iconClassName)} />
    );
  } else if (Icon) {
    iconEl = <Icon className="h-5 w-5 shrink-0" />;
  }

  if (href) {
    const oauthStart = href.includes('/auth/');
    return (
      <a
        href={href}
        onClick={
          oauthStart
            ? () => {
                markOAuthNavigationPending();
                onBeforeNavigate?.();
              }
            : undefined
        }
        className="w-full flex items-center justify-center gap-3 border-2 border-border bg-background py-3 px-4 text-xs font-black uppercase tracking-widest text-card-foreground hover:border-primary hover:bg-muted/50 transition-all active:scale-[0.98]"
      >
        {iconEl}
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className="w-full flex items-center justify-center gap-3 border-2 border-border bg-background py-3 px-4 text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 cursor-not-allowed"
    >
      {iconEl}
      {label}
    </button>
  );
}

function AuthFooter({
  children,
  showHelp = false,
  closeDialog,
}: Readonly<{
  children: React.ReactNode;
  showHelp?: boolean;
  closeDialog?: () => void;
}>) {
  return (
    <div className="mt-8 pt-6 border-t-2 border-border space-y-4 text-center">
      <div className="space-y-2">
        {children}
        {showHelp && (
          <Link
            href="/help/sign-in"
            onClick={closeDialog}
            className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Trouble signing in?
          </Link>
        )}
      </div>
      <p className="text-[9px] leading-relaxed font-medium uppercase tracking-[0.05em] text-muted-foreground/60 px-4">
        By continuing, you agree to our{' '}
        <Link
          href={TERMS_LINK}
          className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all"
        >
          Terms
        </Link>
        {' '}&{' '}
        <Link
          href={PRIVACY_LINK}
          className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export type AuthDialogRenderProps = Readonly<{
  step: AuthDialogStep;
  goToStep: (s: AuthDialogStep) => void;
  close: () => void;
  email: string;
  setEmail: (v: string) => void;
  signupEmail: string;
  setSignupEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  verifyEmail: string;
  stepBeforeVerify: AuthDialogStep;
  loginFormRef: RefObject<HTMLFormElement | null>;
  signupFormRef: RefObject<HTMLFormElement | null>;
  handleSendLoginOtp: (e: FormSubmit) => void | Promise<void>;
  handleSignUp: (e: FormSubmit) => void | Promise<void>;
  handleVerifyCode: (e: FormSubmit) => void | Promise<void>;
  handleVerifyTwoFactor: (e: FormSubmit) => void | Promise<void>;
  altchaOn: boolean;
  isLoading: boolean;
  /** True when the verify step is collecting an authenticator code (store has a 2FA challenge). */
  twoFactorActive: boolean;
  otpAttemptsLeft: number | null;
  resendCooldownSec: number;
  onResendCodeClick: () => void;
  sanitizeOtpInput: (raw: string) => string;
}>;

function renderAuthWelcomeStep(p: AuthDialogRenderProps): ReactNode {
  return (
        <>
          <h2
            id="auth-dialog-title"
            className="text-xl font-black italic tracking-tighter text-card-foreground uppercase pr-10"
          >
            Welcome_back.
          </h2>
          <div className="mt-6 space-y-3">
            <SocialButton
              icon={GoogleIcon}
              label="Sign in with Google"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/google/login` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={FacebookIcon}
              label="Sign in with Facebook"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/facebook/login` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={GithubIcon}
              label="Sign in with GitHub"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/github/login` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              iconSrc={ICON_DISCORD}
              label="Sign in with Discord"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/discord/login` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={XIcon}
              label="Sign in with X"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/x/login` : undefined}
              onBeforeNavigate={p.close}
            />
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.2em] bg-card text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 text-xs font-black uppercase tracking-widest border-2 text-card-foreground"
            onClick={() => p.goToStep('login-email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign in with email
          </Button>
          <AuthFooter showHelp closeDialog={p.close}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              No account?{' '}
              <button
                type="button"
                className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4"
                onClick={() => p.goToStep('signup')}
              >
                Create one
              </button>
            </p>
          </AuthFooter>
        </>
      );
}

function renderAuthLoginEmailStep(p: AuthDialogRenderProps): ReactNode {
  return (
        <>
          <button
            type="button"
            onClick={() => p.goToStep('welcome')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2
            id="auth-dialog-title"
            className="text-xl font-black italic tracking-tighter text-card-foreground uppercase"
          >
            Sign_in_with_email
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            We&apos;ll send you a secure code.
          </p>
          <form ref={p.loginFormRef} onSubmit={p.handleSendLoginOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-login-email"
                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                Your email
              </label>
              <input
                id="auth-login-email"
                type="email"
                placeholder="name@example.com"
                value={p.email}
                onChange={(e) => p.setEmail(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <div className="flex w-full flex-col">
              <AltchaField
                enabled={p.altchaOn}
                floating="bottom"
                floatingAnchor="#auth-login-send-code"
                floatingOffset={8}
              />
              <Button
                id="auth-login-send-code"
                type="submit"
                className="w-full py-6 text-xs font-black uppercase tracking-widest"
                disabled={p.isLoading}
              >
                {p.isLoading ? 'Sending...' : 'Send login code'}
              </Button>
            </div>
          </form>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Need an account?{' '}
              <button
                type="button"
                className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4"
                onClick={() => p.goToStep('signup')}
              >
                Sign up here
              </button>
            </p>
          </AuthFooter>
        </>
      );
}

function renderAuthSignupStep(p: AuthDialogRenderProps): ReactNode {
  return (
        <>
          <button
            type="button"
            onClick={() => p.goToStep('welcome')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2
            id="auth-dialog-title"
            className="text-xl font-black italic tracking-tighter text-card-foreground uppercase"
          >
            Create_Account
          </h2>
          <div className="mt-6 space-y-3">
            <SocialButton
              icon={GoogleIcon}
              label="Sign up with Google"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/google/signup` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={FacebookIcon}
              label="Sign up with Facebook"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/facebook/signup` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={GithubIcon}
              label="Sign up with GitHub"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/github/signup` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              iconSrc={ICON_DISCORD}
              label="Sign up with Discord"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/discord/signup` : undefined}
              onBeforeNavigate={p.close}
            />
            <SocialButton
              icon={XIcon}
              label="Sign up with X"
              href={BACKEND_BASE ? `${BACKEND_BASE}/auth/x/signup` : undefined}
              onBeforeNavigate={p.close}
            />
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.2em] bg-card text-muted-foreground">
                Or
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 text-xs font-black uppercase tracking-widest border-2 text-card-foreground"
            onClick={() => p.goToStep('signup-email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign up with email
          </Button>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Already joined?{' '}
              <button
                type="button"
                className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4"
                onClick={() => p.goToStep('welcome')}
              >
                Sign in
              </button>
            </p>
          </AuthFooter>
        </>
      );
}

function renderAuthSignupEmailStep(p: AuthDialogRenderProps): ReactNode {
  return (
        <>
          <button
            type="button"
            onClick={() => p.goToStep('signup')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2
            id="auth-dialog-title"
            className="text-xl font-black italic tracking-tighter text-card-foreground uppercase"
          >
            Sign_up_with_email
          </h2>
          <form ref={p.signupFormRef} onSubmit={p.handleSignUp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="auth-signup-name"
                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                Full Name
              </label>
              <input
                id="auth-signup-name"
                type="text"
                placeholder="John Doe"
                value={p.name}
                onChange={(e) => p.setName(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="auth-signup-email"
                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                Email Address
              </label>
              <input
                id="auth-signup-email"
                type="email"
                placeholder="name@example.com"
                value={p.signupEmail}
                onChange={(e) => p.setSignupEmail(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <div className="flex w-full flex-col">
              <AltchaField
                enabled={p.altchaOn}
                floating="bottom"
                floatingAnchor="#auth-signup-create"
                floatingOffset={8}
              />
              <Button
                id="auth-signup-create"
                type="submit"
                className="w-full py-6 text-xs font-black uppercase tracking-widest"
                disabled={p.isLoading}
              >
                {p.isLoading ? 'Creating...' : 'Create account'}
              </Button>
            </div>
          </form>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Already joined?{' '}
              <button
                type="button"
                className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4"
                onClick={() => p.goToStep('welcome')}
              >
                Sign in
              </button>
            </p>
          </AuthFooter>
        </>
      );
}

function renderAuthVerifyEmailStep(p: AuthDialogRenderProps): ReactNode {
  const verifyBackLabel =
    p.stepBeforeVerify === 'login-email' || p.stepBeforeVerify === 'signup-email'
      ? 'Change email'
      : 'Back';
  return (
        <>
          <button
            type="button"
            onClick={() => {
              p.setCode('');
              if (p.stepBeforeVerify === 'login-email') p.setEmail(p.verifyEmail);
              if (p.stepBeforeVerify === 'signup-email') p.setSignupEmail(p.verifyEmail);
              p.goToStep(p.stepBeforeVerify);
            }}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {verifyBackLabel}
          </button>
          <h2
            id="auth-dialog-title"
            className="text-xl font-black italic tracking-tighter text-card-foreground uppercase"
          >
            Check_Inbox
          </h2>
          <div className="mt-2 p-3 bg-muted/50 border-l-4 border-primary">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sent to:</p>
            <p className="text-xs font-black break-all text-card-foreground">{p.verifyEmail}</p>
          </div>
          <form
            onSubmit={p.twoFactorActive ? p.handleVerifyTwoFactor : p.handleVerifyCode}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="auth-verify-code"
                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
              >
                {p.twoFactorActive ? 'Authenticator Code' : 'Verification Code'}
              </label>
              <input
                id="auth-verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={p.code}
                onChange={(e) => p.setCode(p.sanitizeOtpInput(e.target.value))}
                className="w-full border-2 border-border bg-background px-4 py-4 text-center text-lg font-black tracking-[0.5em] text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <Button
              type="submit"
              className="w-full py-6 text-xs font-black uppercase tracking-widest"
              disabled={p.isLoading || p.code.length !== 6}
            >
              {p.twoFactorActive ? 'Verify 2FA & Enter' : 'Verify & Enter'}
            </Button>
          </form>
          {p.otpAttemptsLeft != null && p.otpAttemptsLeft > 0 && !p.twoFactorActive && (
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Attempts left: {p.otpAttemptsLeft}
            </p>
          )}
          {!p.twoFactorActive && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={p.isLoading || p.resendCooldownSec > 0}
                onClick={() => p.onResendCodeClick()}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground underline decoration-2 underline-offset-4 hover:text-primary disabled:opacity-40 disabled:no-underline"
              >
                {p.resendCooldownSec > 0 ? `Resend code in ${p.resendCooldownSec}s` : 'Resend code'}
              </button>
            </div>
          )}
          <div className="mt-8 pt-6 border-t-2 border-border">
            <p className="text-[9px] text-center leading-tight font-medium uppercase tracking-widest text-muted-foreground/50">
              Protected by{' '}
              <a
                href="https://altcha.org"
                className="underline hover:text-card-foreground"
                target="_blank"
                rel="noreferrer"
              >
                ALTCHA
              </a>{' '}
              (proof-of-work, no tracking cookies).
              <br />
              <Link
                href={PRIVACY_LINK}
                className="underline hover:text-card-foreground transition-colors"
              >
                Privacy
              </Link>
              {' & '}
              <Link href={TERMS_LINK} className="underline hover:text-card-foreground transition-colors">
                Terms
              </Link>
              .
            </p>
          </div>
        </>
      );
}

export function authDialogRenderStep(p: AuthDialogRenderProps): ReactNode {
  switch (p.step) {
    case 'welcome':
      return renderAuthWelcomeStep(p);
    case 'login-email':
      return renderAuthLoginEmailStep(p);
    case 'signup':
      return renderAuthSignupStep(p);
    case 'signup-email':
      return renderAuthSignupEmailStep(p);
    case 'verify-email':
      return renderAuthVerifyEmailStep(p);
    default:
      return null;
  }
}
