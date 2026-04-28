import type { Request, Response, NextFunction } from 'express';
export declare function updateProfileBasicValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileSocialValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileWorkValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileEducationValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileCertificationsValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileProjectsValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileSetupValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileStackValidation(req: Request, res: Response, next: NextFunction): void;
/** Dispatches the correct Zod schema for `PATCH /auth/profile/:section`. */
export declare function updateProfileSectionBodyValidation(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=profileSection.validation.d.ts.map