import { Router, Request, Response, NextFunction } from 'express';
import {
  optionalVerifyToken,
  type RequestWithOptionalAuth,
} from '../middlewares/auth/optionalVerifyToken.js';
import { verifyAltchaIfConfigured } from '../middlewares/auth/verifyAltcha.js';
import { rateLimitContact } from '../middlewares/auth/rateLimitAuth.js';
import { submitContactLead } from '../controllers/contact.controller.js';

const router = Router();

function requireAltchaUnlessAuthed(req: Request, res: Response, next: NextFunction): void {
  const u = (req as RequestWithOptionalAuth).authUser;
  if (u?._id) {
    next();
    return;
  }
  void verifyAltchaIfConfigured(req, res, next);
}

router.post(
  '/',
  rateLimitContact,
  optionalVerifyToken,
  requireAltchaUnlessAuthed,
  (req, res, next) => {
    void submitContactLead(req, res).catch(next);
  }
);

export default router;
