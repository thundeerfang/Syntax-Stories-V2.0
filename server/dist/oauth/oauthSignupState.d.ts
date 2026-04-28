import type { Request } from 'express';
/**
 * Build Passport `state` for OAuth signup. Optional `?ref=` stores code in Redis under nonce (fail-open).
 */
export declare function buildOAuthSignupState(req: Request): Promise<'signup' | `signup:${string}`>;
//# sourceMappingURL=oauthSignupState.d.ts.map