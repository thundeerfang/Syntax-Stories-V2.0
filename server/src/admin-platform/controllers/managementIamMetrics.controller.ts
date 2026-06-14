import type { Request, Response } from "express";
import { getIamMetrics } from "../iam/iamMetrics.service.js";
import { sendAdminOk } from "../rbac/adminResponse.js";
export async function getIamMetricsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  const metrics = await getIamMetrics();
  const refreshTotal = metrics.refresh_success + metrics.refresh_failure;
  sendAdminOk(res, {
    metrics,
    derived: {
      refreshSuccessRate:
        refreshTotal > 0
          ? Math.round((metrics.refresh_success / refreshTotal) * 1000) / 10
          : null,
      permissionDeniedRate: null,
    },
    collectedAt: new Date().toISOString(),
  });
}
