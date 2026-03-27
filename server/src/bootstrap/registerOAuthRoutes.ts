import type { Express } from 'express';
import passport from 'passport';
import { oauthCallbackHandler, oauthLinkHandler } from '../oauth/oauthExpress';
import { hasFacebookConfig, hasXConfig, hasDiscordConfig } from '../passport/index';
import { getFrontendRedirectBase } from '../config/frontendUrl';

/**
 * Browser OAuth entrypoints and callbacks (Passport redirects).
 * Register after `registerAuthModuleRoutes` so `/auth/google/login` etc. reach these handlers
 * after the JSON router yields for non-matching paths.
 */
export function registerOAuthRoutes(app: Express): void {
  const redirectBaseUrl = getFrontendRedirectBase();

  app.get('/auth/google/login', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
  app.get('/auth/google/signup', passport.authenticate('google', { scope: ['profile', 'email'], state: 'signup' }));
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], state: 'login' }));
  app.get('/auth/google/link', oauthLinkHandler('google', { scope: ['profile', 'email'] }));
  app.get(
    '/auth/google/callback',
    oauthCallbackHandler({
      strategy: 'google',
      failureLabel: 'Google auth failed',
      auditProvider: 'google',
      clientCallbackSlug: 'google-callback',
      idField: 'googleId',
    })
  );

  app.get('/auth/github/login', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
  app.get('/auth/github/signup', passport.authenticate('github', { scope: ['user:email'], state: 'signup' }));
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'], state: 'login' }));
  app.get('/auth/github/link', oauthLinkHandler('github', { scope: ['user:email'] }));
  app.get(
    '/auth/github/callback',
    oauthCallbackHandler({
      strategy: 'github',
      failureLabel: 'GitHub auth failed',
      auditProvider: 'github',
      clientCallbackSlug: 'github-callback',
      idField: 'gitId',
    })
  );

  if (hasDiscordConfig) {
    app.get('/auth/discord/login', passport.authenticate('discord', { state: 'login' }));
    app.get('/auth/discord/signup', passport.authenticate('discord', { state: 'signup' }));
    app.get('/auth/discord', passport.authenticate('discord', { state: 'login' }));
    app.get('/auth/discord/link', oauthLinkHandler('discord'));
    app.get(
      '/auth/discord/callback',
      oauthCallbackHandler({
        strategy: 'discord',
        failureLabel: 'Discord auth failed',
        auditProvider: 'discord',
        clientCallbackSlug: 'discord-callback',
        idField: 'discordId',
      })
    );
  } else {
    const discordRedirectBase = redirectBaseUrl || 'http://localhost:3000';
    const discordErr = encodeURIComponent(
      'Discord OAuth is not configured (set DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BACKEND_URL).'
    );
    app.get('/auth/discord/login', (_req, res) => {
      res.redirect(`${discordRedirectBase}/login?error=${discordErr}`);
    });
    app.get('/auth/discord/signup', (_req, res) => {
      res.redirect(`${discordRedirectBase}/login?error=${discordErr}`);
    });
  }

  if (hasFacebookConfig) {
    app.get('/auth/facebook/login', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
    app.get('/auth/facebook/signup', passport.authenticate('facebook', { scope: ['email'], state: 'signup' }));
    app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'], state: 'login' }));
    app.get('/auth/facebook/link', oauthLinkHandler('facebook', { scope: ['email'] }));
    app.get(
      '/auth/facebook/callback',
      oauthCallbackHandler({
        strategy: 'facebook',
        failureLabel: 'Facebook auth failed',
        auditProvider: 'facebook',
        clientCallbackSlug: 'facebook-callback',
        idField: 'facebookId',
      })
    );
  } else {
    app.get('/auth/facebook', (_req, res) =>
      res.status(501).json({ message: 'Facebook login not configured.', success: false })
    );
  }

  if (hasXConfig) {
    app.get('/auth/x/login', passport.authenticate('twitter', { state: 'login' }));
    app.get('/auth/x/signup', passport.authenticate('twitter', { state: 'signup' }));
    app.get('/auth/x', passport.authenticate('twitter', { state: 'login' }));
    app.get('/auth/x/link', oauthLinkHandler('twitter'));
    app.get(
      '/auth/x/callback',
      oauthCallbackHandler({
        strategy: 'twitter',
        failureLabel: 'X auth failed',
        auditProvider: 'x',
        clientCallbackSlug: 'x-callback',
        idField: 'xId',
      })
    );
  } else {
    app.get('/auth/x', (_req, res) =>
      res.status(501).json({ message: 'X (Twitter) login not configured.', success: false })
    );
  }

  app.get('/auth/apple', (_req, res) => {
    res.status(501).json({
      message:
        'Sign in with Apple is not yet configured. Use Google, GitHub, Facebook, Discord, X, or email OTP.',
      success: false,
    });
  });
}
