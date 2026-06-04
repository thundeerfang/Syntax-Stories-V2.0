/**
 * Seed published FAQ items for the public /help page.
 *
 * Usage:
 *   npm run seed:faq
 *   npm run seed:faq -- --reset   # soft-delete existing help-center articles, then reseed
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resetFaqHelpSeed, seedFaqHelp } from '../admin-platform/seeds/seedFaqHelp.js';

dotenv.config();

async function main(): Promise<void> {
  const uri = process.env.MONGO_CONN ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_CONN or MONGODB_URI is required');
    process.exit(1);
  }

  const reset = process.argv.includes('--reset');

  await mongoose.connect(uri);
  console.log('[seed:faq] Connected');

  if (reset) {
    const removed = await resetFaqHelpSeed();
    console.log(`[seed:faq] Reset: soft-deleted ${removed} existing help-center article(s)`);
  }

  const result = await seedFaqHelp({ skipExisting: !reset, publish: true });
  console.log(
    `[seed:faq] Done — created ${result.created}, published ${result.published}, skipped ${result.skipped}, failed ${result.failed}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:faq] Failed:', err);
  process.exit(1);
});
