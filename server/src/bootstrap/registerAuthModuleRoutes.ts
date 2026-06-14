import type { Express } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
export function registerAuthModuleRoutes(app: Express): void {
  app.use("/auth", authRoutes);
}
