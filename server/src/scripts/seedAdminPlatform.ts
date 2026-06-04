/**
 * Controlled admin-platform reseed (roles, catalog, bootstrap operator).
 * Usage: npm run seed:admin
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { runAdminPlatformSeeds } from '../admin-platform/seeds/runAdminPlatformSeeds.js';

dotenv.config();

async function main(): Promise<void> {
  const uri = process.env.MONGO_CONN ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_CONN or MONGODB_URI is required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('[seed:admin] Connected');
  await runAdminPlatformSeeds();
  console.log('[seed:admin] Done');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:admin] Failed:', err);
  process.exit(1);
});
