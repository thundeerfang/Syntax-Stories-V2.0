import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { OAuthBrowserCallback } from '@/features/auth';
import { getOAuthCallbackProviderLabel } from '@/lib/auth/oauthCallbackProviders';

export default async function OAuthCallbackPage({
  params,
}: Readonly<{
  params: Promise<{ provider: string }>;
}>) {
  const { provider } = await params;
  const label = getOAuthCallbackProviderLabel(provider);
  if (!label) redirect('/login');

  return (
    <Suspense fallback={null}>
      <OAuthBrowserCallback providerLabel={label} />
    </Suspense>
  );
}
