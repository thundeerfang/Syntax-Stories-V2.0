import { seedAccessCatalog } from './accessCatalog.seed.js';
import { seedDefaultRoles } from './defaultRoles.seed.js';
import { seedBootstrapOperator } from './bootstrapOperator.seed.js';
import { ensureDefaultAchievements } from '../../services/achievements/achievementCatalogStore.js';

/** Single orchestrator for admin-platform seeds on Mongo connect. */
export async function runAdminPlatformSeeds(): Promise<void> {
  await seedAccessCatalog();
  await seedDefaultRoles();
  await seedBootstrapOperator();
  await ensureDefaultAchievements();
}

/** @deprecated Use runAdminPlatformSeeds */
export const ensureAdminAccessCatalogSeed = seedAccessCatalog;
