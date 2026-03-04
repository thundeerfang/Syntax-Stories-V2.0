'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, normalizeUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

function GithubCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const twoFactorRequired = searchParams.get('twoFactorRequired');
    const challengeToken = searchParams.get('challengeToken');
    const error = searchParams.get('error');

    if (error) {
      toast.error(error);
      router.replace('/login');
      return;
    }

    if (!token) {
      if (twoFactorRequired && challengeToken) return;
      router.replace('/login');
      return;
    }
    authApi
      .getAccount(token)
      .then((res) => {
        const user = normalizeUser(res.user);
        setAuth(user, token);
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
      setAuth(user, res.accessToken);
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
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Signing you in...</p>
      )}
    </div>
  );
}

export default function GithubCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <GithubCallbackInner />
    </Suspense>
  );
}
