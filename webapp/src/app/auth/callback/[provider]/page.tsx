import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { OAuthBrowserCallback } from '@/components/auth/OAuthBrowserCallback';
import { getOAuthCallbackProviderLabel } from '@/lib/oauthCallbackProviders';

export default async function OAuthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const label = getOAuthCallbackProviderLabel(provider);
  if (!label) redirect('/login');

  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel={label} />
    </Suspense>
  );
}
