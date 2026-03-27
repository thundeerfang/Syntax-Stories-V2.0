'use client';

import { Suspense } from 'react';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';

export default function GithubCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel="GitHub" />
    </Suspense>
  );
}
