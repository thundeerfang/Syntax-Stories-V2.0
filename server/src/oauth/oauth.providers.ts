export type OAuthWhenDisabled = "none" | "redirectLoginSignup" | "stubRoot501";
export type OAuthProviderRegistration = {
  routeKey: string;
  strategy: string;
  linkStrategy?: string;
  failureLabel: string;
  auditProvider: string;
  clientCallbackSlug: string;
  idField: string;
  scopes?: string[];
  optional: boolean;
  isEnabled: () => boolean;
  whenDisabled: OAuthWhenDisabled;
  redirectErrorMessage?: string;
};
function discordRedirectError(): string {
  return encodeURIComponent(
    "Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).",
  );
}
export function getOAuthLinkRouteKeys(): readonly string[] {
  return getOAuthProviderRegistrations({
    hasDiscordConfig: true,
    hasFacebookConfig: true,
    hasXConfig: true,
    hasTwitchConfig: true,
  }).map((p) => p.routeKey);
}
export function isOAuthLinkRouteKey(routeKey: string): boolean {
  return getOAuthLinkRouteKeys().includes(routeKey);
}
function twitchRedirectError(): string {
  return encodeURIComponent(
    "Twitch OAuth is not configured (set TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, BACKEND_URL).",
  );
}
export function getOAuthProviderRegistrations(flags: {
  hasDiscordConfig: boolean;
  hasFacebookConfig: boolean;
  hasXConfig: boolean;
  hasTwitchConfig: boolean;
}): OAuthProviderRegistration[] {
  const { hasDiscordConfig, hasFacebookConfig, hasXConfig, hasTwitchConfig } =
    flags;
  return [
    {
      routeKey: "google",
      strategy: "google",
      failureLabel: "Google auth failed",
      auditProvider: "google",
      clientCallbackSlug: "auth/callback/google",
      idField: "googleId",
      scopes: ["profile", "email"],
      optional: false,
      isEnabled: () => true,
      whenDisabled: "none",
    },
    {
      routeKey: "github",
      strategy: "github",
      failureLabel: "GitHub auth failed",
      auditProvider: "github",
      clientCallbackSlug: "auth/callback/github",
      idField: "gitId",
      scopes: ["user:email"],
      optional: false,
      isEnabled: () => true,
      whenDisabled: "none",
    },
    {
      routeKey: "discord",
      strategy: "discord",
      failureLabel: "Discord auth failed",
      auditProvider: "discord",
      clientCallbackSlug: "auth/callback/discord",
      idField: "discordId",
      optional: true,
      isEnabled: () => hasDiscordConfig,
      whenDisabled: "redirectLoginSignup",
      redirectErrorMessage: discordRedirectError(),
    },
    {
      routeKey: "facebook",
      strategy: "facebook",
      failureLabel: "Facebook auth failed",
      auditProvider: "facebook",
      clientCallbackSlug: "auth/callback/facebook",
      idField: "facebookId",
      scopes: ["email"],
      optional: true,
      isEnabled: () => hasFacebookConfig,
      whenDisabled: "stubRoot501",
    },
    {
      routeKey: "x",
      strategy: "twitter",
      linkStrategy: "twitter",
      failureLabel: "X auth failed",
      auditProvider: "x",
      clientCallbackSlug: "auth/callback/x",
      idField: "xId",
      optional: true,
      isEnabled: () => hasXConfig,
      whenDisabled: "stubRoot501",
    },
    {
      routeKey: "twitch",
      strategy: "twitch",
      failureLabel: "Twitch auth failed",
      auditProvider: "twitch",
      clientCallbackSlug: "auth/callback/twitch",
      idField: "twitchId",
      scopes: ["user:read:email"],
      optional: true,
      isEnabled: () => hasTwitchConfig,
      whenDisabled: "redirectLoginSignup",
      redirectErrorMessage: twitchRedirectError(),
    },
  ];
}
