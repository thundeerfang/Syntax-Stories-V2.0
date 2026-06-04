'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentationApiContractsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/documentation?tab=api-contracts');
  }, [router]);
  return null;
}
