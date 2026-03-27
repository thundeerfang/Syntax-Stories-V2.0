'use client';

import { Suspense } from 'react';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel="Facebook" />
    </Suspense>
  );
}
