'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy URL: access is consolidated under Users → Access tab. */
export default function AccessRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/users?tab=access');
  }, [router]);
  return null;
}
