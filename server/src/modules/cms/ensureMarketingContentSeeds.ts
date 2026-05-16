import { MarketingPageModel } from '../../models/MarketingPage.js';
import { ABOUT_MARKETING_SEED } from './seedData/aboutMarketing.seed.js';

/**
 * Idempotent marketing CMS seed on Mongo connect.
 * Inserts the About page document once; never overwrites existing CMS edits.
 */
export async function ensureMarketingContentSeeds(): Promise<void> {
  const existing = await MarketingPageModel.findOne({ slug: 'about' }).select({ _id: 1 }).lean();
  if (existing) return;

  await MarketingPageModel.create(ABOUT_MARKETING_SEED);
  console.log('[seed] CMS marketing page: about');
}
