import OAuth2Strategy from 'passport-oauth2';
import { env } from '../config/env.js';
import { fetchDiscordMe, normalizeDiscordProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';
export const hasDiscordConfig = !!(env.DISCORD_CLIENT_ID &&
    env.DISCORD_CLIENT_SECRET &&
    env.BACKEND_URL);
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/discord/callback` : '';
export function registerDiscord(passportInstance) {
    if (!hasDiscordConfig || !callbackURL)
        return;
    const strategy = new OAuth2Strategy({
        authorizationURL: 'https://discord.com/api/oauth2/authorize',
        tokenURL: 'https://discord.com/api/oauth2/token',
        clientID: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        callbackURL,
        scope: ['identify', 'email'],
        passReqToCallback: true,
    }, async (req, accessToken, _refreshToken, profile, done) => {
        try {
            const flow = oauthFlowFromReq(req);
            const normalized = normalizeDiscordProfile(profile);
            const user = await handleOAuthProviderAuth({
                provider: 'discord',
                flow,
                accessToken,
                normalized,
                req,
            });
            done(null, user);
        }
        catch (err) {
            done(err, undefined);
        }
    });
    strategy.userProfile = function (accessToken, done) {
        fetchDiscordMe(accessToken)
            .then((d) => done(null, d))
            .catch((err) => done(err));
    };
    strategy.name = 'discord';
    passportInstance.use(strategy);
}
//# sourceMappingURL=discord.js.map