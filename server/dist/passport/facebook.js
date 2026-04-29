import { Strategy as FacebookStrategy } from 'passport-facebook';
import { env } from '../config/env.js';
import { normalizeFacebookProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';
export const hasFacebookConfig = !!(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET);
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/facebook/callback` : '';
export function registerFacebook(passportInstance) {
    if (!hasFacebookConfig)
        return;
    passportInstance.use(new FacebookStrategy({
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL,
        profileFields: ['id', 'displayName', 'emails'],
        passReqToCallback: true,
    }, async (req, accessToken, _refreshToken, profile, done) => {
        try {
            const flow = oauthFlowFromReq(req);
            const normalized = normalizeFacebookProfile(profile);
            const user = await handleOAuthProviderAuth({
                provider: 'facebook',
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
    }));
}
//# sourceMappingURL=facebook.js.map