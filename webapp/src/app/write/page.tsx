'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WriteRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/blogs/write');
  }, [router]);
  return null;
}
