import type { Request, Response } from 'express';
import { assessStaffSessionRisk, getCachedSessionRisk } from '../iam/risk/riskScore.service.js';
import { sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';

/** GET /management/risk — current session risk assessment. */
export async function getSessionRisk(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const sessionId = actor.user.sessionId;
  const cached = sessionId ? await getCachedSessionRisk(sessionId) : null;
  const assessment = cached ?? (await assessStaffSessionRisk(req, actor.user._id, sessionId));
  sendAdminOk(res, assessment);
}
