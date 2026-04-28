/**
 * OAuth `state` must be a string for callbacks — never `String()` on unknown query values
 * (objects become "[object Object]").
 */
export function oauthFlowFromReq(req) {
    const raw = req.query?.state;
    return typeof raw === 'string' && raw.length > 0 ? raw : 'login';
}
//# sourceMappingURL=oauthQuery.js.map