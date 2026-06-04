/**
 * One-shot local/dev seed after wiping MongoDB.
 *
 * Creates RBAC catalog, default roles, platform user, and super-admin operator:
 *   email:    kushwahkh@gmail.com
 *   password: harshi123
 *
 * First login: sign in with email + password, then complete 2FA setup (QR in admin UI)
 * before the dashboard unlocks.
 *
 * Usage (from server/):
 *   npm run seed:superadmin
 *
 * Requires MONGO_CONN or MONGODB_URI in .env
 */
import dotenv from 'dotenv';

dotenv.config();

const SUPER_ADMIN_EMAIL = 'kushwahkh@gmail.com';
const SUPER_ADMIN_PASSWORD = 'harshi123';

process.env.ADMIN_BOOTSTRAP_EMAIL = SUPER_ADMIN_EMAIL;
process.env.ADMIN_BOOTSTRAP_PASSWORD = SUPER_ADMIN_PASSWORD;

async function main(): Promise<void> {
  const mongoose = (await import('mongoose')).default;
  const { seedAccessCatalog } = await import('../admin-platform/seeds/accessCatalog.seed.js');
  const { seedDefaultRoles } = await import('../admin-platform/seeds/defaultRoles.seed.js');
  const { seedBootstrapOperator } = await import('../admin-platform/seeds/bootstrapOperator.seed.js');

  const uri = process.env.MONGO_CONN ?? process.env.MONGODB_URI;
  if (!uri) {
    console.error('[seed:superadmin] MONGO_CONN or MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[seed:superadmin] Connected to MongoDB');

  console.log('[seed:superadmin] Seeding access catalog…');
  await seedAccessCatalog();

  console.log('[seed:superadmin] Seeding default roles…');
  await seedDefaultRoles();

  console.log('[seed:superadmin] Creating super-admin operator…');
  await seedBootstrapOperator({
    email: SUPER_ADMIN_EMAIL,
    password: SUPER_ADMIN_PASSWORD,
    forcePassword: true,
    requireTwoFactorSetup: true,
  });

  console.log('[seed:superadmin] Done.');
  console.log(`  Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('  Step 1:   Sign in at the admin app');
  console.log('  Step 2:   Scan the QR code and enable 2FA (required before dashboard access)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[seed:superadmin] Failed:', err);
  process.exit(1);
});
