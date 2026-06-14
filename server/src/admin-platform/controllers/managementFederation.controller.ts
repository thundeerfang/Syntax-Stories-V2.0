import type { Request, Response } from "express";
import { getFederationStatus } from "../iam/federation.config.js";
import { sendAdminOk } from "../rbac/adminResponse.js";
export async function getFederationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const origin = `${req.protocol}://${req.get("host")}`;
  sendAdminOk(res, getFederationStatus(origin));
}
