'use client';

import { useEffect, Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, normalizeUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { TerminalLoaderPage } from '@/components/loader';
import { toast } from 'sonner';

function FacebookCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const twoFactorRequired = searchParams.get('twoFactorRequired');
    const challengeToken = searchParams.get('challengeToken');
    const error = searchParams.get('error');

    if (error) {
      handledRef.current = true;
      toast.error(error);
      router.replace('/login');
      return;
    }

    if (!token) {
      if (twoFactorRequired && challengeToken) return;
      handledRef.current = true;
      router.replace('/login');
      return;
    }
    handledRef.current = true;
    authApi
      .getAccount(token)
      .then((res) => {
        const user = normalizeUser(res.user);
        setAuth(user, token, refreshToken ?? undefined);
        router.replace('/');
      })
      .catch(() => router.replace('/'));
  }, [searchParams, setAuth, router]);

  const twoFactorRequired = searchParams.get('twoFactorRequired');
  const challengeToken = searchParams.get('challengeToken');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeToken) return;
    setIsSubmitting(true);
    try {
      const res = await authApi.verifyTwoFactorLogin({ challengeToken, token: code });
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
    <div className="flex min-h-[40vh] items-center justify-center">
      {twoFactorRequired && challengeToken ? (
        <form onSubmit={handleVerify} className="w-full max-w-sm space-y-3">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">2FA required</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            className="w-full border-2 border-border bg-background px-4 py-3 text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full border-2 border-border bg-foreground text-background py-3 text-xs font-black uppercase tracking-widest disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
      ) : (
        <TerminalLoaderPage pageName="auth" />
      )}
    </div>
  );
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={<TerminalLoaderPage pageName="auth" />}>
      <FacebookCallbackInner />
    </Suspense>
  );
}
