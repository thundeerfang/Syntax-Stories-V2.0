import mongoose from 'mongoose';
import { env } from './env.js';
import { ensureFeedbackCategorySeeds } from '../modules/feedback/ensureFeedbackCategorySeeds.js';
import { ensureSyntaxAdminSeed } from '../bootstrap/ensureSyntaxAdminSeed.js';
import { ensureAdminAccessCatalogSeed } from '../modules/admin/bootstrap/ensureAdminAccessCatalogSeed.js';
import {
  ensureLegalPoliciesSeed,
  ensureSeedAdminLegalAcceptance,
} from '../modules/legal/ensureLegalPoliciesSeed.js';
import { ensureCmsReferenceSeeds } from '../modules/cms/ensureCmsReferenceSeeds.js';
import { ensureMarketingContentSeeds } from '../modules/cms/ensureMarketingContentSeeds.js';

export async function connectDatabase(): Promise<void> {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI (MONGO_CONN) is required');
  try {
    await mongoose.connect(uri);
    console.log('[MongoDB] Connected');
    await ensureFeedbackCategorySeeds();
    await ensureSyntaxAdminSeed();
    await ensureAdminAccessCatalogSeed();
    await ensureLegalPoliciesSeed();
    await ensureSeedAdminLegalAcceptance();
    await ensureCmsReferenceSeeds();
    await ensureMarketingContentSeeds();
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
    throw err;
  }
}
