/**
 * OAuth provider registry (Week 1: config-driven route registration).
 * URL paths stay `/auth/{routeKey}/...` so clients and provider dashboards need no changes.
 */

export type OAuthWhenDisabled =
  | 'none'
  /** Only when !enabled: GET /auth/{routeKey}/login + /signup redirect to frontend with error */
  | 'redirectLoginSignup'
  /** Only when !enabled: GET /auth/{routeKey} → 501 JSON */
  | 'stubRoot501';

export type OAuthProviderRegistration = {
  /** Path segment after /auth/, e.g. `google` → `/auth/google/login` */
  routeKey: string;
  /** Passport strategy name (also used for oauthLinkHandler except where linkStrategy is set) */
  strategy: string;
  /** Strategy name for `oauthLinkHandler` when different from `strategy` (e.g. X uses `twitter`) */
  linkStrategy?: string;
  failureLabel: string;
  auditProvider: string;
  clientCallbackSlug: string;
  idField: string;
  /** Scopes for passport.authenticate on login/signup/root */
  scopes?: string[];
  /** True when this provider can be turned off via env */
  optional: boolean;
  /** Whether routes should register (from env) */
  isEnabled: () => boolean;
  whenDisabled: OAuthWhenDisabled;
  /** Error query for Discord-style redirect when misconfigured */
  redirectErrorMessage?: string;
};

function discordRedirectError(): string {
  return encodeURIComponent(
    'Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).'
  );
}

/** Registry order is stable; use this for route factories and future shared OAuth service. */
export function getOAuthProviderRegistrations(
  flags: {
    hasDiscordConfig: boolean;
    hasFacebookConfig: boolean;
    hasXConfig: boolean;
  }
): OAuthProviderRegistration[] {
  const { hasDiscordConfig, hasFacebookConfig, hasXConfig } = flags;
  return [
    {
      routeKey: 'google',
      strategy: 'google',
      failureLabel: 'Google auth failed',
      auditProvider: 'google',
      clientCallbackSlug: 'google-callback',
      idField: 'googleId',
      scopes: ['profile', 'email'],
      optional: false,
      isEnabled: () => true,
      whenDisabled: 'none',
    },
    {
      routeKey: 'github',
      strategy: 'github',
      failureLabel: 'GitHub auth failed',
      auditProvider: 'github',
      clientCallbackSlug: 'github-callback',
      idField: 'gitId',
      scopes: ['user:email'],
      optional: false,
      isEnabled: () => true,
      whenDisabled: 'none',
    },
    {
      routeKey: 'discord',
      strategy: 'discord',
      failureLabel: 'Discord auth failed',
      auditProvider: 'discord',
      clientCallbackSlug: 'discord-callback',
      idField: 'discordId',
      optional: true,
      isEnabled: () => hasDiscordConfig,
      whenDisabled: 'redirectLoginSignup',
      redirectErrorMessage: discordRedirectError(),
    },
    {
      routeKey: 'facebook',
      strategy: 'facebook',
      failureLabel: 'Facebook auth failed',
      auditProvider: 'facebook',
      clientCallbackSlug: 'facebook-callback',
      idField: 'facebookId',
      scopes: ['email'],
      optional: true,
      isEnabled: () => hasFacebookConfig,
      whenDisabled: 'stubRoot501',
    },
    {
      routeKey: 'x',
      strategy: 'twitter',
      linkStrategy: 'twitter',
      failureLabel: 'X auth failed',
      auditProvider: 'x',
      clientCallbackSlug: 'x-callback',
      idField: 'xId',
      optional: true,
      isEnabled: () => hasXConfig,
      whenDisabled: 'stubRoot501',
    },
  ];
}
