import type { Express } from 'express';
import passport from 'passport';
import { oauthCallbackHandler, oauthLinkHandler } from '../oauth/oauthExpress.js';
import { getOAuthProviderRegistrations, type OAuthProviderRegistration } from '../oauth/oauth.providers.js';
import { hasFacebookConfig, hasXConfig, hasDiscordConfig } from '../passport/index.js';
import { getFrontendRedirectBase } from '../config/frontendUrl.js';

function registerEnabledProvider(app: Express, def: OAuthProviderRegistration): void {
  const base = `/auth/${def.routeKey}`;
  const strat = def.strategy;
  const scopes = def.scopes;

  const startAuth = (state: 'login' | 'signup') =>
    scopes?.length
      ? passport.authenticate(strat, { scope: scopes, state })
      : passport.authenticate(strat, { state });

  app.get(`${base}/login`, startAuth('login'));
  app.get(`${base}/signup`, startAuth('signup'));
  app.get(base, startAuth('login'));

  const linkStrat = def.linkStrategy ?? def.strategy;
  const linkOpts = scopes?.length ? { scope: scopes } : {};
  app.get(`${base}/link`, oauthLinkHandler(linkStrat, linkOpts));

  app.get(
    `${base}/callback`,
    oauthCallbackHandler({
      strategy: strat,
      failureLabel: def.failureLabel,
      auditProvider: def.auditProvider,
      clientCallbackSlug: def.clientCallbackSlug,
      idField: def.idField,
    })
  );
}

function registerDisabledStubs(
  app: Express,
  def: OAuthProviderRegistration,
  redirectBaseUrl: string
): void {
  if (def.whenDisabled === 'redirectLoginSignup' && def.redirectErrorMessage) {
    const targetBase = redirectBaseUrl || 'http://localhost:3000';
    const err = def.redirectErrorMessage;
    app.get(`/auth/${def.routeKey}/login`, (_req, res) => {
      res.redirect(`${targetBase}/login?error=${err}`);
    });
    app.get(`/auth/${def.routeKey}/signup`, (_req, res) => {
      res.redirect(`${targetBase}/login?error=${err}`);
    });
    return;
  }

  if (def.whenDisabled === 'stubRoot501') {
    const msg =
      def.routeKey === 'x'
        ? 'X (Twitter) login not configured.'
        : 'Facebook login not configured.';
    app.get(`/auth/${def.routeKey}`, (_req, res) =>
      res.status(501).json({ message: msg, success: false })
    );
  }
}

/**
 * Browser OAuth entrypoints and callbacks (Passport redirects).
 * Register after `registerAuthModuleRoutes` so `/auth/google/login` etc. reach these handlers
 * after the JSON router yields for non-matching paths.
 */
export function registerOAuthRoutes(app: Express): void {
  const redirectBaseUrl = getFrontendRedirectBase();
  const providers = getOAuthProviderRegistrations({
    hasDiscordConfig,
    hasFacebookConfig,
    hasXConfig,
  });

  for (const def of providers) {
    if (def.isEnabled()) {
      registerEnabledProvider(app, def);
    } else if (def.optional) {
      registerDisabledStubs(app, def, redirectBaseUrl);
    }
  }

  app.get('/auth/apple', (_req, res) => {
    res.status(501).json({
      message:
        'Sign in with Apple is not yet configured. Use Google, GitHub, Facebook, Discord, X, or email OTP.',
      success: false,
    });
  });
}
