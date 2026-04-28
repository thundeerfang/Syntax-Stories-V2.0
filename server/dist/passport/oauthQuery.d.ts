import type { Request } from 'express';
/**
 * OAuth `state` must be a string for callbacks — never `String()` on unknown query values
 * (objects become "[object Object]").
 */
export declare function oauthFlowFromReq(req: Pick<Request, 'query'>): string;
//# sourceMappingURL=oauthQuery.d.ts.map