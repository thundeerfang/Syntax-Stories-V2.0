'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = useAuthDialogStore((s) => s.open);
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  useEffect(() => {
    if (!isHydrated) return;
    if (token) {
      router.replace('/');
      return;
    }
    const error = searchParams.get('error');
    // Dedupe: React Strict Mode runs this effect twice in dev; same Sonner id = one toast.
    if (error) {
      toast.error(error, { id: 'syntax-stories-login-oauth-error' });
    }
    open('login');
    router.replace('/');
  }, [isHydrated, token, open, router, searchParams]);
  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
