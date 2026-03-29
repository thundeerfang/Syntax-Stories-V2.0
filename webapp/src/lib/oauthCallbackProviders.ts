/** Route keys for `/auth/callback/[provider]` — must match server `oauth.providers` `routeKey`. */
export const OAUTH_CALLBACK_PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
  discord: 'Discord',
  facebook: 'Facebook',
  x: 'X',
};

export function getOAuthCallbackProviderLabel(provider: string): string | null {
  const key = provider.toLowerCase();
  return OAUTH_CALLBACK_PROVIDER_LABELS[key] ?? null;
}
