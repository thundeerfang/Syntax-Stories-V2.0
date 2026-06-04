'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy URL — security lives under Settings. */
export default function SecurityRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/security');
  }, [router]);
  return null;
}
