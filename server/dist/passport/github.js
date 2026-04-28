import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from '../config/env.js';
import { normalizeGithubProfile } from '../oauth/oauth.profiles.js';
import { handleOAuthProviderAuth } from '../oauth/oauth.service.js';
import { oauthFlowFromReq } from './oauthQuery.js';
const callbackURL = env.BACKEND_URL ? `${env.BACKEND_URL}/auth/github/callback` : '';
export function registerGithub(passportInstance) {
    const strategy = new GitHubStrategy({
        clientID: env.GITHUB_CLIENT_ID ?? '',
        clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
        callbackURL,
        scope: ['user:email'],
        passReqToCallback: true,
    }, async (...args) => {
        const [req, accessToken, _refreshToken, profile, done] = args;
        try {
            const flow = oauthFlowFromReq(req);
            const normalized = normalizeGithubProfile(profile);
            const user = await handleOAuthProviderAuth({
                provider: 'github',
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
    passportInstance.use(strategy);
}
//# sourceMappingURL=github.js.map