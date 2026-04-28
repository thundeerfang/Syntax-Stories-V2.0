/**
 * OAuth provider registry (Week 1: config-driven route registration).
 * URL paths stay `/auth/{routeKey}/...` so clients and provider dashboards need no changes.
 *
 * Passport remains the HTTP/OAuth transport; domain rules live in `oauth.service.ts` so a future
 * swap to direct OAuth2/OIDC handlers can reuse the same service without rewriting user linking.
 */
function discordRedirectError() {
    return encodeURIComponent('Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).');
}
/** Registry order is stable; use this for route factories and future shared OAuth service. */
export function getOAuthProviderRegistrations(flags) {
    const { hasDiscordConfig, hasFacebookConfig, hasXConfig } = flags;
    return [
        {
            routeKey: 'google',
            strategy: 'google',
            failureLabel: 'Google auth failed',
            auditProvider: 'google',
            clientCallbackSlug: 'auth/callback/google',
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
            clientCallbackSlug: 'auth/callback/github',
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
            clientCallbackSlug: 'auth/callback/discord',
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
            clientCallbackSlug: 'auth/callback/facebook',
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
            clientCallbackSlug: 'auth/callback/x',
            idField: 'xId',
            optional: true,
            isEnabled: () => hasXConfig,
            whenDisabled: 'stubRoot501',
        },
    ];
}
//# sourceMappingURL=oauth.providers.js.map