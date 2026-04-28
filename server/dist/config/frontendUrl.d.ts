/** First `FRONTEND_URL` entry — OAuth redirects and similar. */
export declare function getFrontendRedirectBase(): string;
/** Comma-separated production frontends for CORS. */
export declare function getProductionAllowedOrigins(): string[];
export declare function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean;
//# sourceMappingURL=frontendUrl.d.ts.map