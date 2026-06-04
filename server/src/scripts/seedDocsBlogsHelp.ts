/**
 * Seed published blog documentation for /docs (category: documentation).
 *
 * Usage:
 *   npm run seed:docs:blogs
 *   npm run seed:docs:blogs -- --reset   # remove blog doc slugs only, then reseed
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { resetDocsBlogsHelpSeed, seedDocsBlogsHelp } from '../admin-platform/seeds/seedDocsBlogsHelp.js';

dotenv.config();

async function main(): Promise<void> {
  const uri = process.env.MONGO_CONN ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_CONN or MONGODB_URI is required');
    process.exit(1);
  }

  const reset = process.argv.includes('--reset');

  await mongoose.connect(uri);
  console.log('[seed:docs:blogs] Connected');

  if (reset) {
    const removed = await resetDocsBlogsHelpSeed();
    console.log(`[seed:docs:blogs] Reset: removed ${removed} blog documentation article(s)`);
  }

  const result = await seedDocsBlogsHelp({ skipExisting: !reset, publish: true });
  console.log(
    `[seed:docs:blogs] Done — created ${result.created}, published ${result.published}, skipped ${result.skipped}, failed ${result.failed}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:docs:blogs] Failed:', err);
  process.exit(1);
});
