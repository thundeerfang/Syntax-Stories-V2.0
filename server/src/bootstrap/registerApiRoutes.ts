import type { Express } from 'express';
import routes from '../routes/index.js';

/** Core REST API under `/api` (health, follow, blog, analytics, …). */
export function registerApiRoutes(app: Express): void {
  app.use('/api', routes);
}
