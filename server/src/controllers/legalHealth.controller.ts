import type { Request, Response } from "express";
import mongoose from "mongoose";
import { assertLegalBootstrapHealth } from "../admin-platform/cms/legal/ensureLegalPoliciesSeed.js";
export async function getLegalHealth(
  _req: Request,
  res: Response,
): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    res
      .status(503)
      .json({ ok: false, service: "legal", reason: "database_unavailable" });
    return;
  }
  const r = await assertLegalBootstrapHealth();
  if (!r.ok) {
    res.status(503).json({
      ok: false,
      service: "legal",
      code: "LEGAL_BOOTSTRAP_INCOMPLETE",
      missing: r.missing,
    });
    return;
  }
  res.status(200).json({ ok: true, service: "legal" });
}
