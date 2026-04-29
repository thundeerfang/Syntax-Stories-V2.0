/**
 * OAuth provider registry (Week 1: config-driven route registration).
 * URL paths stay `/auth/{routeKey}/...` so clients and provider dashboards need no changes.
 *
 * Passport remains the HTTP/OAuth transport; domain rules live in `oauth.service.ts` so a future
 * swap to direct OAuth2/OIDC handlers can reuse the same service without rewriting user linking.
 */
export type OAuthWhenDisabled = 'none'
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
/** Registry order is stable; use this for route factories and future shared OAuth service. */
export declare function getOAuthProviderRegistrations(flags: {
    hasDiscordConfig: boolean;
    hasFacebookConfig: boolean;
    hasXConfig: boolean;
}): OAuthProviderRegistration[];
//# sourceMappingURL=oauth.providers.d.ts.map