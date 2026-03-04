'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthDialogStore } from '@/store/authDialog';

export default function SignupPage() {
  const router = useRouter();
  const open = useAuthDialogStore((s) => s.open);
  useEffect(() => {
    open('signup');
    router.replace('/');
  }, [open, router]);
  return null;
}
