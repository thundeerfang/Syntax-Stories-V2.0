'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentationCmsWorkflowRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/documentation?tab=cms-workflow');
  }, [router]);
  return null;
}
