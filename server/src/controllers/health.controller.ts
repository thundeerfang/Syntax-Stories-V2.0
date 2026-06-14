import { Request, Response } from "express";
import { recordPlatformHealthCheck } from "../services/platform/platformUptime.service.js";
export async function getHealth(_req: Request, res: Response): Promise<void> {
  void recordPlatformHealthCheck(true);
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
}
