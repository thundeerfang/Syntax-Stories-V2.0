'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = useAuthDialogStore((s) => s.open);
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) toast.error(error);
    open('login');
    router.replace('/');
  }, [open, router, searchParams]);
  return null;
}
