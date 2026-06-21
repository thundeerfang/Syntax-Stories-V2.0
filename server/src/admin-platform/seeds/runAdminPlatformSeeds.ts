import { seedAccessCatalog } from "./accessCatalog.seed.js";
import { seedDefaultRoles } from "./defaultRoles.seed.js";
import { seedBootstrapOperator } from "./bootstrapOperator.seed.js";
import { ensureDefaultAchievements } from "../../services/achievements/achievementCatalogStore.js";
import {
  ensureLegalPoliciesSeed,
  ensureSeedAdminLegalAcceptance,
} from "../cms/legal/ensureLegalPoliciesSeed.js";
export async function runAdminPlatformSeeds(): Promise<void> {
  await seedAccessCatalog();
  await seedDefaultRoles();
  await seedBootstrapOperator();
  await ensureLegalPoliciesSeed();
  await ensureSeedAdminLegalAcceptance();
  await ensureDefaultAchievements();
}
export const ensureAdminAccessCatalogSeed = seedAccessCatalog;
