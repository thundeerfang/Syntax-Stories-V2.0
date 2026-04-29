import type { RequestHandler } from 'express';
import type { AuthenticateOptions } from 'passport';
/** Validate link key in Redis, then Passport with `state: link:<key>`. */
export declare function oauthLinkHandler(strategy: string, authenticateOptions?: AuthenticateOptions): RequestHandler;
export type OAuthCallbackParams = {
    strategy: string;
    failureLabel: string;
    auditProvider: string;
    clientCallbackSlug: string;
    idField: string;
};
export declare function oauthCallbackHandler(params: OAuthCallbackParams): RequestHandler;
//# sourceMappingURL=oauthExpress.d.ts.map