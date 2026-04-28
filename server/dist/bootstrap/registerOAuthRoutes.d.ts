import type { Express } from 'express';
/**
 * Browser OAuth entrypoints and callbacks (Passport redirects).
 * Register after `registerAuthModuleRoutes` so `/auth/google/login` etc. reach these handlers
 * after the JSON router yields for non-matching paths.
 */
export declare function registerOAuthRoutes(app: Express): void;
//# sourceMappingURL=registerOAuthRoutes.d.ts.map