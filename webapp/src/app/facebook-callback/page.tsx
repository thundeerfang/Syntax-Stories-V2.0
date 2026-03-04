'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, normalizeUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

function FacebookCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/');
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

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Signing you in...</p>
    </div>
  );
}

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><p className="text-sm text-muted-foreground">Loading...</p></div>}>
      <FacebookCallbackInner />
    </Suspense>
  );
}
