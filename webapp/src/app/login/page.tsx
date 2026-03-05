'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export default function LoginPage() {
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
    if (error) toast.error(error);
    open('login');
    router.replace('/');
  }, [isHydrated, token, open, router, searchParams]);
  return null;
}
