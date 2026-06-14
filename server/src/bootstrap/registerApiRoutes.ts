import type { Express } from "express";
import routes from "../routes/index.js";
import { requireLegalAcceptanceForMutations } from "../admin-platform/cms/legal/requireLegalAcceptance.middleware.js";
export function registerApiRoutes(app: Express): void {
  app.use("/api", requireLegalAcceptanceForMutations);
  app.use("/api", routes);
}
