export declare function createAuthChallenge(userId: string): Promise<{
    challengeToken: string;
    expiresIn: number;
}>;
export declare function consumeAuthChallenge(challengeToken: string): Promise<{
    userId: string;
} | null>;
//# sourceMappingURL=authChallenge.d.ts.map