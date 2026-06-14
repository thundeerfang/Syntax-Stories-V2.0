import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { sendAdminError } from "../adminResponse.js";
import type { StaffManagementRequest } from "./staffManagementContext.js";
import {
  actorHasZone,
  type SecurityZone,
} from "../../iam/securityZones.config.js";
export function requireSecurityZone(zone: SecurityZone) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
      next();
      return;
    }
    const r = req as StaffManagementRequest;
    const perms = r.adminPermissions;
    if (!perms || !actorHasZone(perms, zone)) {
      sendAdminError(
        res,
        403,
        "PERMISSION_DENIED",
        `This action requires the ${zone} security zone.`,
      );
      return;
    }
    next();
  };
}
