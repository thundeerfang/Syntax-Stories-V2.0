'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, normalizeUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { TerminalLoaderPage } from '@/components/loader';
import { toast } from 'sonner';

export type OAuthBrowserCallbackProps = {
  /** Short label for loader copy, e.g. "Google". */
  providerLabel: string;
};

/**
 * Handles browser OAuth return: `code` (Redis exchange → POST /auth/oauth/exchange) or 2FA challenge.
 */
export function OAuthBrowserCallback({ providerLabel }: OAuthBrowserCallbackProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [totpCode, setTotpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const error = searchParams.get('error');
    const twoFactorRequired = searchParams.get('twoFactorRequired');
    const challengeToken = searchParams.get('challengeToken');
    const oauthExchangeCode = searchParams.get('code');

    if (error) {
      handledRef.current = true;
      toast.error(error);
      router.replace('/login');
      return;
    }

    if (twoFactorRequired && challengeToken) return;

    if (oauthExchangeCode) {
      handledRef.current = true;
      authApi
        .exchangeOAuthCode(oauthExchangeCode)
        .then((res) => {
          if (!res.success || !res.accessToken) {
            toast.error(res.message ?? 'Sign-in failed');
            router.replace('/login');
            return;
          }
          return authApi.getAccount(res.accessToken).then((accountRes) => {
            const user = normalizeUser(accountRes.user);
            setAuth(user, res.accessToken!, res.refreshToken ?? undefined);
            router.replace('/');
          });
        })
        .catch(() => {
          toast.error('Sign-in failed');
          router.replace('/login');
        });
      return;
    }

    handledRef.current = true;
    router.replace('/login');
  }, [searchParams, setAuth, router]);

  const twoFactorRequired = searchParams.get('twoFactorRequired');
  const challengeToken = searchParams.get('challengeToken');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setIsSubmitting(true);
    try {
      const res = await authApi.verifyTwoFactorLogin({ challengeToken, token: totpCode });
      const user = normalizeUser(res.user);
      setAuth(user, res.accessToken, res.refreshToken ?? undefined);
      toast.success('Signed in successfully.');
      router.replace('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid 2FA code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center py-12 sm:py-16">
      {twoFactorRequired && challengeToken ? (
        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-3">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-muted-foreground">2FA required</p>
          <input
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            className="w-full border-2 border-border bg-background px-4 py-3 text-center text-lg font-black tracking-[0.5em] focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full border-2 border-border bg-foreground py-3 text-xs font-black uppercase tracking-widest text-background disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      ) : (
        <TerminalLoaderPage pageName="auth" inline status={`Completing ${providerLabel} sign-in…`} />
      )}
    </div>
  );
}
