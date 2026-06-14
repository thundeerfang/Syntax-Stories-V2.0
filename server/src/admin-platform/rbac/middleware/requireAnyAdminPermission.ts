import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { sendAdminError } from "../adminResponse.js";
import type { StaffManagementRequest } from "./staffManagementContext.js";
import { authorize } from "../../iam/policyEngine.service.js";
import { incrementIamMetric } from "../../iam/iamMetrics.service.js";
export function requireAnyAdminPermission(...permissions: string[]) {
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
    let stepUpRequired: Awaited<ReturnType<typeof authorize>> | null = null;
    for (const permission of permissions) {
      const result = await authorize({ req: r, permission });
      if (result.allow) {
        next();
        return;
      }
      if (result.code === "STEP_UP_REQUIRED") {
        stepUpRequired = result;
      }
    }
    if (stepUpRequired && stepUpRequired.code === "STEP_UP_REQUIRED") {
      void incrementIamMetric("step_up_required");
      sendAdminError(res, 403, "STEP_UP_REQUIRED", stepUpRequired.message, {
        methods: ["totp", "passkey"],
      });
      return;
    }
    void incrementIamMetric("permission_denied");
    console.warn("[admin] PERMISSION_DENIED", {
      actorId: uid,
      route: `${req.method} ${req.originalUrl}`,
      requiredPermission: permissions.join("|"),
      t: new Date().toISOString(),
    });
    sendAdminError(
      res,
      403,
      "PERMISSION_DENIED",
      "You do not have access to this action.",
    );
  };
}
