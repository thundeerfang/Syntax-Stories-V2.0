export type OAuthExchangePayload = {
    accessToken: string;
    refreshToken: string;
    userId: string;
    /** User document field name (e.g. googleId) for client parity with legacy redirects. */
    idField: string;
    providerId: string;
};
/**
 * Store tokens server-side; returns opaque code for redirect query (Week 3).
 * Returns `null` when Redis is unavailable — caller should fall back to legacy URL tokens.
 */
export declare function storeOAuthExchange(payload: OAuthExchangePayload): Promise<string | null>;
/** Single-use: deletes key after successful read. */
export declare function consumeOAuthExchange(code: string): Promise<OAuthExchangePayload | null>;
//# sourceMappingURL=oauth.exchange.service.d.ts.map