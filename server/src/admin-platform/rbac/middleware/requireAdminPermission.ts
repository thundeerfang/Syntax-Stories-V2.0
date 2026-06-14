import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { sendAdminError } from "../adminResponse.js";
import type { StaffManagementRequest } from "./staffManagementContext.js";
import { authorize } from "../../iam/policyEngine.service.js";
import { incrementIamMetric } from "../../iam/iamMetrics.service.js";
export function requireAdminPermission(permission: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
      next();
      return;
    }
    const r = req as StaffManagementRequest;
    const uid = r.user?._id;
    const result = await authorize({ req: r, permission });
    if (!result.allow) {
      if (
        result.code === "PERMISSION_DENIED" ||
        result.code === "ZONE_DENIED"
      ) {
        void incrementIamMetric("permission_denied");
        console.warn("[admin] PERMISSION_DENIED", {
          actorId: uid,
          route: `${req.method} ${req.originalUrl}`,
          requiredPermission: permission,
          code: result.code,
          t: new Date().toISOString(),
        });
      }
      if (result.code === "STEP_UP_REQUIRED") {
        void incrementIamMetric("step_up_required");
        sendAdminError(res, 403, "STEP_UP_REQUIRED", result.message, {
          methods: ["totp", "passkey"],
        });
        return;
      }
      if (result.code === "RISK_BLOCKED") {
        void incrementIamMetric("risk_blocked");
        sendAdminError(res, 403, "RISK_BLOCKED", result.message);
        return;
      }
      if (result.code === "REBAC_DENIED") {
        sendAdminError(res, 403, "REBAC_DENIED", result.message);
        return;
      }
      sendAdminError(res, 403, "PERMISSION_DENIED", result.message);
      return;
    }
    next();
  };
}
