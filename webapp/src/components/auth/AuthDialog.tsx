'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';
import { Button, Dialog } from '@/components/ui';
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

type Step = 'welcome' | 'login-email' | 'signup' | 'signup-email' | 'verify-email';

const TERMS_LINK = '/terms';
const PRIVACY_LINK = '/privacy';

// --- Reusable Sub-Components ---

function SocialButton({
  icon: Icon,
  iconSrc,
  iconClassName,
  label,
  href,
  onBeforeNavigate,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  iconSrc?: string;
  iconClassName?: string;
  label: string;
  href?: string;
  /** Runs after marking OAuth pending; use to close the dialog so loaders do not stack on the card. */
  onBeforeNavigate?: () => void;
}) {
  const iconEl =
    iconSrc != null ? (
      <img src={iconSrc} alt="" className={cn('h-5 w-5 shrink-0 object-contain', iconClassName)} />
    ) : Icon ? (
      <Icon className="h-5 w-5 shrink-0" />
    ) : null;

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
  closeDialog 
}: { 
  children: React.ReactNode; 
  showHelp?: boolean;
  closeDialog?: () => void;
}) {
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
        <Link href={TERMS_LINK} className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all">Terms</Link>
        {' '}&{' '}
        <Link href={PRIVACY_LINK} className="underline decoration-muted-foreground/30 hover:text-card-foreground hover:decoration-primary transition-all">Privacy Policy</Link>.
      </p>
    </div>
  );
}

const BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const authStepTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1] as const,
};

// --- Main Component ---

export function AuthDialog() {
  const { isOpen, initialView, close } = useAuthDialogStore();
  const { sendLoginOtp, signUp, verifyCode, verifyTwoFactor, isLoading, twoFactor } = useAuth();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

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

  const goToStep = useCallback((next: Step) => {
    setStep(next);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStep(initialView === 'signup' ? 'signup' : 'welcome');
      setEmail('');
      setName('');
      setSignupEmail('');
      setCode('');
      setVerifyEmail('');
    }
  }, [isOpen, initialView]);

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendLoginOtp(email);
      setVerifyEmail(email);
      setStepBeforeVerify('login-email');
      setStep('verify-email');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send code. Please try again.';
      toast.error(message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(name, signupEmail);
      setVerifyEmail(signupEmail);
      setStepBeforeVerify('signup');
      setStep('verify-email');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      toast.error(message);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyCode(verifyEmail, code);
      if (!twoFactor) {
        if (stepBeforeVerify === 'signup' || stepBeforeVerify === 'signup-email') {
          toast.success('Account created successfully.');
        } else {
          toast.success('Signed in successfully.');
        }
        close();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid code. Please try again.';
      toast.error(message);
    }
  };

  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
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

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      titleId="auth-dialog-title"
      panelClassName="max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto ss-scrollbar-hide"
      contentClassName="relative overflow-x-hidden p-5 sm:p-6"
    >
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            role="region"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={stepMotionTransition}
            className="will-change-transform"
          >
      {/* 1. WELCOME STEP */}
      {step === 'welcome' && (
        <>
          <h2 id="auth-dialog-title" className="text-xl font-black italic tracking-tighter text-card-foreground uppercase pr-10">
            Welcome_back.
          </h2>
          <div className="mt-6 space-y-3">
            <SocialButton icon={GoogleIcon} label="Sign in with Google" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/google/login` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={FacebookIcon} label="Sign in with Facebook" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/facebook/login` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={GithubIcon} label="Sign in with GitHub" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/github/login` : undefined} onBeforeNavigate={close} />
            <SocialButton iconSrc={ICON_DISCORD} label="Sign in with Discord" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/discord/login` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={XIcon} label="Sign in with X" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/x/login` : undefined} onBeforeNavigate={close} />
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.2em] bg-card text-muted-foreground">Or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 text-xs font-black uppercase tracking-widest border-2 text-card-foreground"
            onClick={() => goToStep('login-email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign in with email
          </Button>
          <AuthFooter showHelp closeDialog={close}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              No account?{' '}
              <button
                type="button"
                className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4"
                onClick={() => goToStep('signup')}
              >
                Create one
              </button>
            </p>
          </AuthFooter>
        </>
      )}

      {/* 2. EMAIL LOGIN STEP */}
      {step === 'login-email' && (
        <>
          <button
            type="button"
            onClick={() => goToStep('welcome')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 id="auth-dialog-title" className="text-xl font-black italic tracking-tighter text-card-foreground uppercase">Sign_in_with_email</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">We&apos;ll send you a secure code.</p>
          <form onSubmit={handleSendLoginOtp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-login-email" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Your email
              </label>
              <input
                id="auth-login-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <Button type="submit" className="w-full py-6 text-xs font-black uppercase tracking-widest" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send login code'}
            </Button>
          </form>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Need an account?{' '}
              <button type="button" className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4" onClick={() => goToStep('signup')}>
                Sign up here
              </button>
            </p>
          </AuthFooter>
        </>
      )}

      {/* 3. SIGNUP STEP — social + email options */}
      {step === 'signup' && (
        <>
          <button
            type="button"
            onClick={() => goToStep('welcome')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 id="auth-dialog-title" className="text-xl font-black italic tracking-tighter text-card-foreground uppercase">Create_Account</h2>
          <div className="mt-6 space-y-3">
            <SocialButton icon={GoogleIcon} label="Sign up with Google" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/google/signup` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={FacebookIcon} label="Sign up with Facebook" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/facebook/signup` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={GithubIcon} label="Sign up with GitHub" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/github/signup` : undefined} onBeforeNavigate={close} />
            <SocialButton iconSrc={ICON_DISCORD} label="Sign up with Discord" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/discord/signup` : undefined} onBeforeNavigate={close} />
            <SocialButton icon={XIcon} label="Sign up with X" href={BACKEND_BASE ? `${BACKEND_BASE}/auth/x/signup` : undefined} onBeforeNavigate={close} />
          </div>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.2em] bg-card text-muted-foreground">Or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full py-6 text-xs font-black uppercase tracking-widest border-2 text-card-foreground"
            onClick={() => goToStep('signup-email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Sign up with email
          </Button>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Already joined?{' '}
              <button type="button" className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4" onClick={() => goToStep('welcome')}>
                Sign in
              </button>
            </p>
          </AuthFooter>
        </>
      )}

      {/* 3b. SIGNUP WITH EMAIL — name + email form */}
      {step === 'signup-email' && (
        <>
          <button
            type="button"
            onClick={() => goToStep('signup')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 id="auth-dialog-title" className="text-xl font-black italic tracking-tighter text-card-foreground uppercase">Sign_up_with_email</h2>
          <form onSubmit={handleSignUp} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-signup-name" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Full Name
              </label>
              <input
                id="auth-signup-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="auth-signup-email" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Email Address
              </label>
              <input
                id="auth-signup-email"
                type="email"
                placeholder="name@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                className="w-full border-2 border-border bg-background px-4 py-3 text-xs font-black uppercase tracking-widest text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <Button type="submit" className="w-full py-6 text-xs font-black uppercase tracking-widest" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create account'}
            </Button>
          </form>
          <AuthFooter>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Already joined?{' '}
              <button type="button" className="text-card-foreground hover:text-primary underline decoration-2 underline-offset-4" onClick={() => goToStep('welcome')}>
                Sign in
              </button>
            </p>
          </AuthFooter>
        </>
      )}

      {/* 4. VERIFY STEP */}
      {step === 'verify-email' && (
        <>
          <button
            type="button"
            onClick={() => goToStep(stepBeforeVerify)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h2 id="auth-dialog-title" className="text-xl font-black italic tracking-tighter text-card-foreground uppercase">Check_Inbox</h2>
          <div className="mt-2 p-3 bg-muted/50 border-l-4 border-primary">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sent to:</p>
            <p className="text-xs font-black break-all text-card-foreground">{verifyEmail}</p>
          </div>
          <form onSubmit={twoFactor ? handleVerifyTwoFactor : handleVerifyCode} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-verify-code" className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {twoFactor ? 'Authenticator Code' : 'Verification Code'}
              </label>
              <input
                id="auth-verify-code"
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border-2 border-border bg-background px-4 py-4 text-center text-lg font-black tracking-[0.5em] text-card-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <Button type="submit" className="w-full py-6 text-xs font-black uppercase tracking-widest" disabled={isLoading}>
              {twoFactor ? 'Verify 2FA & Enter' : 'Verify & Enter'}
            </Button>
          </form>
          <div className="mt-8 pt-6 border-t-2 border-border">
             <p className="text-[9px] text-center leading-tight font-medium uppercase tracking-widest text-muted-foreground/50">
                Protected by reCAPTCHA.<br />
                <Link href={PRIVACY_LINK} className="underline hover:text-card-foreground transition-colors">Google Privacy</Link> & <Link href={TERMS_LINK} className="underline hover:text-card-foreground transition-colors">Terms</Link> apply.
             </p>
          </div>
        </>
      )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Dialog>
  );
}