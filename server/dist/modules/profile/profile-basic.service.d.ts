export type BasicRulesResult = {
    ok: true;
} | {
    ok: false;
    status: number;
    message: string;
    code: string;
};
/**
 * Caps stack list and resolves username uniqueness + lowercase (basic section).
 */
export declare function applyBasicProfileRules(userId: string, updates: Record<string, unknown>): Promise<BasicRulesResult>;
//# sourceMappingURL=profile-basic.service.d.ts.map