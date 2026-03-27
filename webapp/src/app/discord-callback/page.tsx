'use client';

import { Suspense } from 'react';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel="Discord" />
    </Suspense>
  );
}
