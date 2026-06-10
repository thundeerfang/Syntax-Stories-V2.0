'use client';

import type { RefObject, ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/retroui/Checkbox';
import { Text } from '@/components/retroui/Text';
import {
  GoogleIcon,
  GithubIcon,
  FacebookIcon,
  XIcon,
  ICON_DISCORD,
} from '@/components/icons/SocialProviderIcons';
import { SOCIAL_ICON_TWITCH } from '@/lib/icons';
import { cn } from '@/lib/core/utils';
import type { AuthWelcomeTitle } from '@/lib/auth/authWelcomeVisitor';
import { markOAuthNavigationPending } from '@/lib/auth/oauthNavigation';
import { oauthLoginHref, oauthSignupHref } from '@/lib/auth/oauthStartHref';
import {
  clearLegalSignupAckCookie,
  setLegalSignupAckCookie,
} from '@/lib/auth/legalSignupAckCookie';
import { AltchaField } from './AltchaField';
import { SignupReferralField } from './SignupReferralField';
import type { ReferralValidationState } from '../hooks/useSignupReferralCode';
import type { InviteResolveValid } from '@/api/invite';
import type { AuthDialogStep } from './authDialogStep';
import {
  AuthEmailOutlineButton,
  AuthInboxCallout,
  AuthOrDivider,
  AuthSocialGrid,
  AuthSocialGroup,
  AuthStepHeader,
  AuthWelcomeHero,
  authInputClassName,
  authSocialButtonClassNames,
} from './authDialogUi';

const TERMS_LINK = '/terms';
const PRIVACY_LINK = '/privacy';
type FormSubmit = { preventDefault(): void; currentTarget: HTMLFormElement };

function SocialButton({
  icon: Icon,
  iconSrc,
  iconClassName,
  label,
  href,
  onBeforeNavigate,
  disabled = false,
}: Readonly<{
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  iconClassName?: string;
  label: string;
  href?: string;
  onBeforeNavigate?: () => void;
  disabled?: boolean;
}>) {
  let iconEl: React.ReactNode = null;
  if (iconSrc != null) {
    iconEl = (
      <img src={iconSrc} alt="" className={cn('h-5 w-5 shrink-0 object-contain', iconClassName)} />
    );
  } else if (Icon) {
    iconEl = <Icon className="h-5 w-5 shrink-0" />;
  }

  const className = authSocialButtonClassNames(disabled);

  if (href && !disabled) {
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
        className={className}
      >
        <span className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center">
          {iconEl}
        </span>
        <span className="text-center">{label}</span>
      </a>
    );
  }
  if (href && disabled) {
    return (
      <span role="presentation" className={className}>
        <span className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center">
          {iconEl}
        </span>
        <span className="text-center">{label}</span>
      </span>
    );
  }
  return (
    <button type="button" disabled className={authSocialButtonClassNames(true)}>
      <span className="pointer-events-none absolute left-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center">
        {iconEl}
      </span>
      <span className="text-center">{label}</span>
    </button>
  );
}

function AuthFooter({
  children,
  closeDialog,
  compact = false,
  showLegalBlurb = true,
}: Readonly<{
  children: React.ReactNode;
  closeDialog?: () => void;
  /** Tighter top spacing so tall steps (e.g. signup + back link) stay inside the dialog without a sliver of scroll. */
  compact?: boolean;
  /** When false, hide the default Terms/Privacy line (e.g. signup steps use an explicit consent checkbox). */
  showLegalBlurb?: boolean;
}>) {
  return (
    <div
      className={cn(
        'border-t border-muted-foreground/20 text-center',
        compact ? 'mt-4 space-y-2 pt-3' : 'mt-5 space-y-2.5 pt-4'
      )}
    >
      <div className="space-y-2">
        {children}
      </div>
      {showLegalBlurb ? (
        <p className="text-[8px] leading-snug font-medium uppercase tracking-[0.04em] text-muted-foreground/60 px-2">
          By continuing, you agree to our{' '}
          <Link
            href={TERMS_LINK}
            className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all"
          >
            Terms
          </Link>{' '}
          &{' '}
          <Link
            href={PRIVACY_LINK}
            className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all"
          >
            Privacy Policy
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function AuthSignupLegalConsent(
  p: Readonly<{
    termsAccepted: boolean;
    privacyAccepted: boolean;
    onTermsChange: (next: boolean) => void;
    onPrivacyChange: (next: boolean) => void;
    closeDialog: () => void;
  }>
): ReactNode {
  const syncOAuthCookie = (terms: boolean, privacy: boolean) => {
    if (terms && privacy) setLegalSignupAckCookie();
    else clearLegalSignupAckCookie();
  };

  return (
    <div className="space-y-2 border border-border/20 bg-background/15 px-2.5 py-2">
      <div className="flex gap-2 items-center">
        <Checkbox
          checked={p.termsAccepted}
          onCheckedChange={(next) => {
            p.onTermsChange(next);
            syncOAuthCookie(next, p.privacyAccepted);
          }}
          className="shrink-0"
          aria-label="Accept Terms of Service"
        />
        <Text className="text-left text-[11px] font-medium normal-case leading-snug tracking-wide text-muted-foreground">
          I have read and accept the{' '}
          <Link
            href={TERMS_LINK}
            className="text-card-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
            onClick={() => p.closeDialog()}
          >
            Terms of Service
          </Link>
          .
        </Text>
      </div>
      <div className="flex gap-2 items-center">
        <Checkbox
          checked={p.privacyAccepted}
          onCheckedChange={(next) => {
            p.onPrivacyChange(next);
            syncOAuthCookie(p.termsAccepted, next);
          }}
          className="shrink-0"
          aria-label="Accept Privacy Policy"
        />
        <Text className="text-left text-[11px] font-medium normal-case leading-snug tracking-wide text-muted-foreground">
          I have read and accept the{' '}
          <Link
            href={PRIVACY_LINK}
            className="text-card-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
            onClick={() => p.closeDialog()}
          >
            Privacy Policy
          </Link>
          .
        </Text>
      </div>
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
  legalTermsAccepted: boolean;
  setLegalTermsAccepted: (v: boolean) => void;
  legalPrivacyAccepted: boolean;
  setLegalPrivacyAccepted: (v: boolean) => void;
  welcomeTitle: AuthWelcomeTitle;
  referralInput: string;
  setReferralInputValue: (v: string) => void;
  referralValidationState: ReferralValidationState;
  referralReferrer: InviteResolveValid | null;
  referralErrorMessage: string | null;
  referralBlocksSignup: boolean;
}>;

function renderAuthWelcomeStep(p: AuthDialogRenderProps): ReactNode {
  return (
    <>
      <AuthWelcomeHero title={p.welcomeTitle} />
      <AuthSocialGrid>
        <SocialButton
          icon={GoogleIcon}
          label="Google"
          href={oauthLoginHref('/auth/google/login')}
          onBeforeNavigate={p.close}
        />
        <SocialButton
          icon={FacebookIcon}
          label="Facebook"
          href={oauthLoginHref('/auth/facebook/login')}
          onBeforeNavigate={p.close}
        />
        <SocialButton
          icon={GithubIcon}
          label="GitHub"
          href={oauthLoginHref('/auth/github/login')}
          onBeforeNavigate={p.close}
        />
        <SocialButton
          iconSrc={ICON_DISCORD}
          label="Discord"
          href={oauthLoginHref('/auth/discord/login')}
          onBeforeNavigate={p.close}
        />
        <SocialButton
          icon={XIcon}
          label="X.com"
          href={oauthLoginHref('/auth/x/login')}
          onBeforeNavigate={p.close}
        />
        <SocialButton
          iconSrc={SOCIAL_ICON_TWITCH}
          label="Twitch"
          href={oauthLoginHref('/auth/twitch/login')}
          onBeforeNavigate={p.close}
        />
      </AuthSocialGrid>
      <AuthOrDivider />
      <AuthEmailOutlineButton
        label="Sign in with email"
        onClick={() => p.goToStep('login-email')}
      />
      <AuthFooter compact closeDialog={p.close}>
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
      <AuthStepHeader title="Sign in with email" variant="login" />
      <form ref={p.loginFormRef} onSubmit={p.handleSendLoginOtp} className="mt-3 space-y-3">
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
            className={authInputClassName()}
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
            className="w-full py-4 text-xs font-black uppercase tracking-widest"
            disabled={p.isLoading}
          >
            {p.isLoading ? 'Sending...' : 'Send login code'}
          </Button>
        </div>
      </form>
      <AuthFooter compact closeDialog={p.close}>
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

function signupLegalReady(p: AuthDialogRenderProps): boolean {
  return p.legalTermsAccepted && p.legalPrivacyAccepted;
}

function renderAuthSignupStep(p: AuthDialogRenderProps): ReactNode {
  const ok = signupLegalReady(p) && !p.referralBlocksSignup;
  const oauthRef = p.referralValidationState === 'valid' ? p.referralInput.trim() : null;
  return (
    <>
      <AuthStepHeader title="Create account" variant="signup" />
      <div className="mt-3">
        <SignupReferralField
          value={p.referralInput}
          onChange={p.setReferralInputValue}
          validationState={p.referralValidationState}
          referrer={p.referralReferrer}
          errorMessage={p.referralErrorMessage}
          disabled={p.isLoading}
        />
      </div>
      <div className="mt-3">
        <AuthSocialGroup>
          <SocialButton
            icon={GoogleIcon}
            label="Google"
            href={oauthSignupHref('/auth/google/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
          <SocialButton
            icon={FacebookIcon}
            label="Facebook"
            href={oauthSignupHref('/auth/facebook/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
          <SocialButton
            icon={GithubIcon}
            label="GitHub"
            href={oauthSignupHref('/auth/github/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
          <SocialButton
            iconSrc={ICON_DISCORD}
            label="Discord"
            href={oauthSignupHref('/auth/discord/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
          <SocialButton
            icon={XIcon}
            label="X.com"
            href={oauthSignupHref('/auth/x/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
          <SocialButton
            iconSrc={SOCIAL_ICON_TWITCH}
            label="Twitch"
            href={oauthSignupHref('/auth/twitch/signup', oauthRef)}
            onBeforeNavigate={p.close}
            disabled={!ok}
          />
        </AuthSocialGroup>
      </div>
      <AuthOrDivider />
      <AuthEmailOutlineButton
        label="Sign up with email"
        disabled={!ok}
        onClick={() => p.goToStep('signup-email')}
      />
      <div className="mt-3">
        <AuthSignupLegalConsent
          termsAccepted={p.legalTermsAccepted}
          privacyAccepted={p.legalPrivacyAccepted}
          onTermsChange={p.setLegalTermsAccepted}
          onPrivacyChange={p.setLegalPrivacyAccepted}
          closeDialog={p.close}
        />
      </div>
      <AuthFooter compact showLegalBlurb={false}>
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
  const ok = signupLegalReady(p) && !p.referralBlocksSignup;
  return (
    <>
      <AuthStepHeader title="Sign up with email" variant="signup" />
      <form ref={p.signupFormRef} onSubmit={p.handleSignUp} className="mt-3 space-y-3">
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
            className={authInputClassName()}
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
            className={authInputClassName()}
          />
        </div>
        <SignupReferralField
          id="auth-signup-email-referral"
          value={p.referralInput}
          onChange={p.setReferralInputValue}
          validationState={p.referralValidationState}
          referrer={p.referralReferrer}
          errorMessage={p.referralErrorMessage}
          disabled={p.isLoading}
        />
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
            className="w-full py-4 text-xs font-black uppercase tracking-widest"
            disabled={p.isLoading || !ok}
          >
            {p.isLoading ? 'Creating...' : 'Create account'}
          </Button>
        </div>
      </form>
      <div className="mt-3">
        <AuthSignupLegalConsent
          termsAccepted={p.legalTermsAccepted}
          privacyAccepted={p.legalPrivacyAccepted}
          onTermsChange={p.setLegalTermsAccepted}
          onPrivacyChange={p.setLegalPrivacyAccepted}
          closeDialog={p.close}
        />
      </div>
      <AuthFooter compact showLegalBlurb={false}>
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
  return (
    <>
      <AuthStepHeader title="Check your inbox" variant="verify" />
      <AuthInboxCallout label="Sent to" email={p.verifyEmail} />
      <form
        onSubmit={p.twoFactorActive ? p.handleVerifyTwoFactor : p.handleVerifyCode}
        className="mt-3 space-y-3"
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
            className={authInputClassName('py-4 text-center text-lg font-black tracking-[0.5em]')}
          />
        </div>
        <Button
          type="submit"
          className="w-full py-4 text-xs font-black uppercase tracking-widest"
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
      <div className="mt-4 border-t border-border/70 pt-3">
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
            onClick={() => p.close()}
          >
            Privacy
          </Link>
          {' & '}
          <Link
            href={TERMS_LINK}
            className="underline hover:text-card-foreground transition-colors"
            onClick={() => p.close()}
          >
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
