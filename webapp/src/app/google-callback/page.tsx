'use client';

import { Suspense } from 'react';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel="Google" />
    </Suspense>
  );
}
