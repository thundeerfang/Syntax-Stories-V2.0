'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';

export default function SignupPage() {
  const router = useRouter();
  const open = useAuthDialogStore((s) => s.open);
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  useEffect(() => {
    if (!isHydrated) return;
    if (token) {
      router.replace('/');
      return;
    }
    open('signup');
    router.replace('/');
  }, [isHydrated, token, open, router]);
  return null;
}
