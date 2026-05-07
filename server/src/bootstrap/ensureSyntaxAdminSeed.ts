import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';

/** Seeded CMS admin (password set in Mongo via bootstrap; default `1234` as bcrypt hash). */
export const SYNTAX_ADMIN_EMAIL = 'admin@syntax.com';
const SYNTAX_ADMIN_USERNAME = 'syntax_admin_root';
const SEED_PASSWORD_PLAINTEXT = '1234';
const BCRYPT_ROUNDS = 10;

/**
 * Ensures the CMS admin user exists with `staffRole` admin and a staff password hash.
 * Idempotent: sets default bcrypt hash for `1234` only when `staffPasswordHash` is missing.
 */
export async function ensureSyntaxAdminSeed(): Promise<void> {
  const email = SYNTAX_ADMIN_EMAIL.toLowerCase();

  const existing = await UserModel.findOne({ email }).select('+staffPasswordHash');
  if (existing) {
    const patch: {
      staffRole: 'admin';
      twoFactorEnabled: false;
      emailVerified: true;
      staffPasswordHash?: string;
    } = {
      staffRole: 'admin',
      twoFactorEnabled: false,
      emailVerified: true,
    };
    if (!existing.staffPasswordHash) {
      patch.staffPasswordHash = await bcrypt.hash(SEED_PASSWORD_PLAINTEXT, BCRYPT_ROUNDS);
    }
    await UserModel.updateOne({ _id: existing._id }, { $set: patch });
    console.log(
      `[seed] CMS admin ${email} — ${patch.staffPasswordHash ? 'default staff password set' : 'already configured'}`
    );
    return;
  }

  const staffPasswordHash = await bcrypt.hash(SEED_PASSWORD_PLAINTEXT, BCRYPT_ROUNDS);

  const user = new UserModel({
    fullName: 'Syntax Administrator',
    username: SYNTAX_ADMIN_USERNAME,
    email,
    staffRole: 'admin',
    staffPasswordHash,
    isGoogleAccount: false,
    isGitAccount: false,
    isFacebookAccount: false,
    isXAccount: false,
    isAppleAccount: false,
    isDiscordAccount: false,
    emailVerified: true,
    twoFactorEnabled: false,
  });
  await user.save();
  const subscription = await SubscriptionModel.create({
    userId: user._id,
    plan: 'free',
    status: 'active',
    source: 'manual',
  });
  user.subscription = subscription._id;
  await user.save();
  console.log(`[seed] Created CMS admin ${email} — POST /auth/staff-login (default password in seed source)`);
}
