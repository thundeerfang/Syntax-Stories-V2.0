/**
 * Seed published product documentation for /docs (category: documentation).
 *
 * Usage:
 *   npm run seed:docs
 *   npm run seed:docs -- --reset   # remove existing documentation articles, then reseed
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resetDocsHelpSeed, seedDocsHelp } from '../admin-platform/seeds/seedDocsHelp.js';

dotenv.config();

async function main(): Promise<void> {
  const uri = process.env.MONGO_CONN ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_CONN or MONGODB_URI is required');
    process.exit(1);
  }

  const reset = process.argv.includes('--reset');

  await mongoose.connect(uri);
  console.log('[seed:docs] Connected');

  if (reset) {
    const removed = await resetDocsHelpSeed();
    console.log(`[seed:docs] Reset: removed ${removed} existing documentation article(s)`);
  }

  const result = await seedDocsHelp({ skipExisting: !reset, publish: true });
  console.log(
    `[seed:docs] Done — created ${result.created}, published ${result.published}, skipped ${result.skipped}, failed ${result.failed}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:docs] Failed:', err);
  process.exit(1);
});
