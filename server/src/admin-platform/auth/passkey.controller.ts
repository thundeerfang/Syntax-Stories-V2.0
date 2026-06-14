import type { Request, Response } from "express";
import { UserModel } from "../../models/User.js";
import type { AuthUser } from "../../middlewares/auth/index.js";
import { completeAdminStepUp } from "../iam/adminSessionIdle.service.js";
import { writeAuditLog } from "../../shared/audit/auditLog.js";
import { AuditAction } from "../../shared/audit/events.js";
import { incrementIamMetric } from "../iam/iamMetrics.service.js";
import { isPasskeyFeatureEnabled } from "./webauthn.config.js";
import {
  createPasskeyRegistrationOptions,
  createPasskeyStepUpOptions,
  getPasskeyStatus,
  removePasskey,
  setPasskeyStepUpEnabled,
  verifyPasskeyRegistration,
  verifyPasskeyStepUp,
} from "./passkey.service.js";
function requireUser(req: Request, res: Response): AuthUser | null {
  const user = (
    req as Request & {
      user?: AuthUser;
    }
  ).user;
  if (!user?._id || !user.sessionId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return user;
}
export async function getPasskeyStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!isPasskeyFeatureEnabled()) {
      res
        .status(200)
        .json({ success: true, enabled: false, registered: false, count: 0 });
      return;
    }
    const user = requireUser(req, res);
    if (!user) return;
    const status = await getPasskeyStatus(user._id);
    if (!status) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, enabled: true, ...status });
  } catch (err) {
    console.error("[getPasskeyStatus]", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
export async function passkeyRegisterOptions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!isPasskeyFeatureEnabled()) {
      res
        .status(400)
        .json({ success: false, message: "Passkey step-up is disabled" });
      return;
    }
    const user = requireUser(req, res);
    if (!user) return;
    const dbUser = await UserModel.findById(user._id).select("email");
    if (!dbUser?.email) {
      res.status(400).json({ success: false, message: "User email required" });
      return;
    }
    const options = await createPasskeyRegistrationOptions(
      user._id,
      dbUser.email,
    );
    res.status(200).json({ success: true, options });
  } catch (err) {
    console.error("[passkeyRegisterOptions]", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not start passkey registration",
      });
  }
}
export async function passkeyRegisterVerify(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const body = req.body as {
      response?: unknown;
      deviceLabel?: string;
    };
    if (!body.response) {
      res.status(400).json({ success: false, message: "response is required" });
      return;
    }
    await verifyPasskeyRegistration(
      user._id,
      body.response as import("@simplewebauthn/server").RegistrationResponseJSON,
      body.deviceLabel,
    );
    void writeAuditLog(req, AuditAction.ADMIN_PASSKEY_REGISTERED, {
      actorId: user._id,
      metadata: { deviceLabel: body.deviceLabel },
    });
    res.status(200).json({ success: true, message: "Passkey registered" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ success: false, message: msg });
  }
}
export async function passkeyPreferences(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { stepUpEnabled } = req.body as {
      stepUpEnabled?: boolean;
    };
    if (typeof stepUpEnabled !== "boolean") {
      res
        .status(400)
        .json({ success: false, message: "stepUpEnabled boolean required" });
      return;
    }
    await setPasskeyStepUpEnabled(user._id, stepUpEnabled);
    res.status(200).json({ success: true, stepUpEnabled });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    res.status(400).json({ success: false, message: msg });
  }
}
export async function passkeyRemove(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const credentialId = (
      req.body as {
        credentialId?: string;
      }
    ).credentialId;
    await removePasskey(user._id, credentialId);
    void writeAuditLog(req, AuditAction.ADMIN_PASSKEY_REMOVED, {
      actorId: user._id,
    });
    res.status(200).json({ success: true, message: "Passkey removed" });
  } catch (err) {
    res
      .status(400)
      .json({
        success: false,
        message: err instanceof Error ? err.message : "Failed",
      });
  }
}
export async function passkeyStepUpOptions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const sessionId = user.sessionId!;
    const options = await createPasskeyStepUpOptions(user._id, sessionId);
    res.status(200).json({ success: true, options });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Biometric step-up unavailable";
    res.status(400).json({ success: false, message: msg });
  }
}
export async function passkeyStepUpVerify(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const body = req.body as {
      response?: unknown;
    };
    if (!body.response) {
      res.status(400).json({ success: false, message: "response is required" });
      return;
    }
    const sessionId = user.sessionId!;
    await verifyPasskeyStepUp(
      user._id,
      sessionId,
      body.response as import("@simplewebauthn/server").AuthenticationResponseJSON,
    );
    await completeAdminStepUp(sessionId, user._id);
    void incrementIamMetric("step_up_verified");
    void writeAuditLog(req, AuditAction.ADMIN_STEP_UP_VERIFIED, {
      actorId: user._id,
      metadata: { sessionId, method: "passkey" },
    });
    res.status(200).json({
      success: true,
      message: "Step-up verification successful",
      expiresInSeconds: 15 * 60,
      method: "passkey",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification failed";
    res.status(401).json({ success: false, message: msg });
  }
}
