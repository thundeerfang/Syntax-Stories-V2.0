/**
 * Account-owner projection: `GET /auth/me`, `PATCH /auth/profile*`.
 * Always map DB lean docs through this (or `toPublicProfile`) before JSON — avoid returning raw models.
 */
export declare function mapUserDocumentToApiUser(found: Record<string, unknown>): Record<string, unknown>;
/** Alias for account responses (settings / session user). */
export declare const toAccountUser: typeof mapUserDocumentToApiUser;
/**
 * Public profile by username: same field pick as account for now; omit or redact here when a dedicated public route uses this mapper.
 */
export declare function toPublicProfile(found: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=profile.mapper.d.ts.map