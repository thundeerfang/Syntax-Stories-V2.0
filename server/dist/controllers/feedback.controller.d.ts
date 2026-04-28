import { Request, Response } from 'express';
/** GET /api/feedback/categories */
export declare function listFeedbackCategories(_req: Request, res: Response): Promise<void>;
/** POST /api/feedback (multipart: fields + optional attachment) */
export declare function submitFeedback(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=feedback.controller.d.ts.map