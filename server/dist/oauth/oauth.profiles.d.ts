import type { NormalizedOAuthProfile } from './oauth.types.js';
type GoogleLikeProfile = {
    id: string;
    displayName?: string;
    emails?: Array<{
        value?: string;
    }>;
    photos?: Array<{
        value?: string;
    }>;
};
export declare function normalizeGoogleProfile(profile: GoogleLikeProfile): NormalizedOAuthProfile;
type GitHubLikeProfile = {
    id: string | number;
    _json?: {
        email?: string;
        name?: string;
        avatar_url?: string;
    };
    emails?: Array<{
        value: string;
        primary?: boolean;
    }>;
    displayName?: string;
    username?: string;
};
export declare function normalizeGithubProfile(profile: GitHubLikeProfile): NormalizedOAuthProfile;
type FacebookLikeProfile = {
    id: string;
    displayName?: string;
    emails?: Array<{
        value?: string;
    }>;
    photos?: Array<{
        value?: string;
    }>;
};
export declare function normalizeFacebookProfile(profile: FacebookLikeProfile): NormalizedOAuthProfile;
type XLikeProfile = {
    id: string;
    displayName?: string;
    username?: string;
    emails?: Array<{
        value?: string;
    }>;
    photos?: Array<{
        value?: string;
    }>;
};
export declare function normalizeXProfile(profile: XLikeProfile): NormalizedOAuthProfile;
/** Discord `/users/@me` payload (passport-oauth2 userProfile). */
export type DiscordMeProfile = {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    email?: string | null;
};
export declare function fetchDiscordMe(accessToken: string): Promise<DiscordMeProfile>;
export declare function normalizeDiscordProfile(discordUser: DiscordMeProfile): NormalizedOAuthProfile;
export {};
//# sourceMappingURL=oauth.profiles.d.ts.map