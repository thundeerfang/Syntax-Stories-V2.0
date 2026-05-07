import type { Express } from 'express';
import routes from '../routes/index.js';
import { requireLegalAcceptanceForMutations } from '../modules/legal/requireLegalAcceptance.middleware.js';

/** Core REST API under `/api` (health, follow, blog, analytics, …). */
export function registerApiRoutes(app: Express): void {
  app.use('/api', requireLegalAcceptanceForMutations);
  app.use('/api', routes);
}
