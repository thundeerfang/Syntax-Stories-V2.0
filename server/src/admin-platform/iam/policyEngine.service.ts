import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import { graphAllows } from "./permissionCompiler.service.js";
import {
  actorHasZone,
  zoneForPermission,
  type SecurityZone,
} from "./securityZones.config.js";
import { env } from "../../config/env.js";
import { permissionRequiresStepUp } from "./stepUp.config.js";
import { hasValidStepUp } from "./stepUp.service.js";
import { assessStaffSessionRisk } from "./risk/riskScore.service.js";
import { rebacAllows, type RebacResource } from "./rebac/rebac.service.js";
export type AuthorizeContext = {
  ip?: string;
  userAgent?: string;
  environment?: string;
  targetRoleLevel?: number;
  rebacResource?: RebacResource;
};
export type AuthorizeInput = {
  req: StaffManagementRequest;
  permission: string;
  context?: AuthorizeContext;
};
export type AuthorizeResult =
  | {
      allow: true;
    }
  | {
      allow: false;
      code:
        | "PERMISSION_DENIED"
        | "ZONE_DENIED"
        | "STEP_UP_REQUIRED"
        | "RISK_BLOCKED"
        | "REBAC_DENIED";
      message: string;
    };
export async function authorize(
  input: AuthorizeInput,
): Promise<AuthorizeResult> {
  const { req, permission, context } = input;
  const perms = req.adminPermissions;
  const uid = req.user?._id;
  const sessionId = req.user?.sessionId;
  const graph = req.compiledPermissionGraph;
  const hasPermission =
    perms?.has(permission) === true ||
    (graph != null && graphAllows(graph, permission));
  if (!hasPermission) {
    return {
      allow: false,
      code: "PERMISSION_DENIED",
      message: "You do not have access to this action.",
    };
  }
  const zone = zoneForPermission(permission);
  if (zone === "finance" && perms && !actorHasZone(perms, "finance")) {
    return {
      allow: false,
      code: "ZONE_DENIED",
      message: "Finance zone access required for this action.",
    };
  }
  if (zone === "root" && perms && !actorHasZone(perms, "root")) {
    return {
      allow: false,
      code: "ZONE_DENIED",
      message: "Root zone access required for this action.",
    };
  }
  if (
    context?.targetRoleLevel != null &&
    (permission === "admin_role:manage" ||
      permission === "admin_assignment:manage")
  ) {
    const { getActorMaxRoleLevel } =
      await import("../rbac/services/rbac.service.js");
    const actorMax = await getActorMaxRoleLevel(uid);
    if (context.targetRoleLevel > actorMax) {
      return {
        allow: false,
        code: "PERMISSION_DENIED",
        message: "Cannot act on a role above your effective level.",
      };
    }
  }
  if (env.FEATURE_ADMIN_REBAC && context?.rebacResource) {
    const rebac = rebacAllows(req, permission, context.rebacResource);
    if (!rebac.allow) {
      return { allow: false, code: "REBAC_DENIED", message: rebac.message };
    }
  }
  if (permissionRequiresStepUp(permission) && sessionId && uid) {
    const steppedUp = await hasValidStepUp(sessionId, uid);
    if (!steppedUp) {
      return {
        allow: false,
        code: "STEP_UP_REQUIRED",
        message: "Confirm your identity with 2FA to continue.",
      };
    }
  }
  if (env.FEATURE_ADMIN_RISK_ENGINE && uid) {
    const risk = await assessStaffSessionRisk(req, uid, sessionId);
    if (risk.decision === "BLOCK") {
      return {
        allow: false,
        code: "RISK_BLOCKED",
        message: "Session risk too high. Sign in again or contact security.",
      };
    }
    if (
      risk.decision === "STEP_UP" &&
      sessionId &&
      permissionRequiresStepUp(permission) === false
    ) {
      const steppedUp = await hasValidStepUp(sessionId, uid);
      if (!steppedUp) {
        return {
          allow: false,
          code: "STEP_UP_REQUIRED",
          message: "Elevated risk detected. Confirm with 2FA to continue.",
        };
      }
    }
  }
  return { allow: true };
}
export function requireZoneForPermission(
  permission: string,
): SecurityZone | null {
  const z = zoneForPermission(permission);
  if (z === "finance" || z === "root") return z;
  return null;
}
