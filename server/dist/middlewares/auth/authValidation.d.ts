import { Request, Response, NextFunction } from 'express';
export * from './profileZodSchemas.js';
export declare function sendOtpValidation(req: Request, res: Response, next: NextFunction): void;
export declare function signupEmailValidation(req: Request, res: Response, next: NextFunction): void;
export declare function verifyOtpValidation(req: Request, res: Response, next: NextFunction): void;
export declare function updateProfileValidation(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=authValidation.d.ts.map