import type { Request, Response } from 'express';
export declare function initEmailChange(req: Request, res: Response): Promise<void>;
export declare function verifyEmailChange(req: Request, res: Response): Promise<void>;
/** Cancel pending email change: invalidate codes so verify will fail with "expired or invalid". */
export declare function cancelEmailChange(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=emailChange.controller.d.ts.map