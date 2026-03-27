'use client';

import { Suspense } from 'react';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';

export default function XCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel="X" />
    </Suspense>
  );
}
