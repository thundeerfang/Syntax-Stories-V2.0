import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import {
  oauthCallbackHandler,
  oauthLinkHandler,
} from "../oauth/oauthExpress.js";
import {
  getOAuthProviderRegistrations,
  type OAuthProviderRegistration,
} from "../oauth/oauth.providers.js";
import {
  hasFacebookConfig,
  hasXConfig,
  hasDiscordConfig,
  hasTwitchConfig,
} from "../passport/index.js";
import { buildOAuthSignupState } from "../oauth/oauthSignupState.js";
import {
  attachOAuthReturnOrigin,
  resolveOAuthRedirectBase,
} from "../oauth/oauthReturnOrigin.js";
function registerEnabledProvider(
  app: Express,
  def: OAuthProviderRegistration,
): void {
  const base = `/auth/${def.routeKey}`;
  const strat = def.strategy;
  const scopes = def.scopes;
  const startAuth = (state: "login" | "signup") =>
    scopes?.length
      ? passport.authenticate(strat, { scope: scopes, state })
      : passport.authenticate(strat, { state });
  const startSignupWithOptionalRef = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const state = await buildOAuthSignupState(req);
    const authFn = scopes?.length
      ? passport.authenticate(strat, { scope: scopes, state })
      : passport.authenticate(strat, { state });
    return authFn(req, res, next);
  };
  app.get(`${base}/login`, attachOAuthReturnOrigin, startAuth("login"));
  app.get(
    `${base}/signup`,
    attachOAuthReturnOrigin,
    startSignupWithOptionalRef,
  );
  app.get(base, attachOAuthReturnOrigin, startAuth("login"));
  const linkStrat = def.linkStrategy ?? def.strategy;
  const linkOpts = scopes?.length ? { scope: scopes } : {};
  app.get(
    `${base}/link`,
    attachOAuthReturnOrigin,
    oauthLinkHandler(linkStrat, linkOpts),
  );
  app.get(
    `${base}/callback`,
    oauthCallbackHandler({
      strategy: strat,
      failureLabel: def.failureLabel,
      auditProvider: def.auditProvider,
      clientCallbackSlug: def.clientCallbackSlug,
      idField: def.idField,
    }),
  );
}
function registerDisabledStubs(
  app: Express,
  def: OAuthProviderRegistration,
): void {
  if (def.whenDisabled === "redirectLoginSignup" && def.redirectErrorMessage) {
    const err = def.redirectErrorMessage;
    app.get(
      `/auth/${def.routeKey}/login`,
      attachOAuthReturnOrigin,
      (req, res) => {
        const base = resolveOAuthRedirectBase(req, res);
        res.redirect(`${base}/login?error=${err}`);
      },
    );
    app.get(
      `/auth/${def.routeKey}/signup`,
      attachOAuthReturnOrigin,
      (req, res) => {
        const base = resolveOAuthRedirectBase(req, res);
        res.redirect(`${base}/login?error=${err}`);
      },
    );
    return;
  }
  if (def.whenDisabled === "stubRoot501") {
    const msg =
      def.routeKey === "x"
        ? "X (Twitter) login not configured."
        : "Facebook login not configured.";
    app.get(`/auth/${def.routeKey}`, (_req, res) =>
      res.status(501).json({ message: msg, success: false }),
    );
  }
}
export function registerOAuthRoutes(app: Express): void {
  const providers = getOAuthProviderRegistrations({
    hasDiscordConfig,
    hasFacebookConfig,
    hasXConfig,
    hasTwitchConfig,
  });
  for (const def of providers) {
    if (def.isEnabled()) {
      registerEnabledProvider(app, def);
    } else if (def.optional) {
      registerDisabledStubs(app, def);
    }
  }
  app.get("/auth/apple", (_req, res) => {
    res.status(501).json({
      message:
        "Sign in with Apple is not yet configured. Use Google, GitHub, Facebook, Discord, X, Twitch, or email OTP.",
      success: false,
    });
  });
}
