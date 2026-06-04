'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentationPublishingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/documentation?tab=publishing');
  }, [router]);
  return null;
}
