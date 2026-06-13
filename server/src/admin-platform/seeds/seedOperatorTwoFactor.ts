import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserModel } from '../../models/User.js';

export type SeedTwoFactorResult = {
  secret: string;
  otpauthUrl: string;
};

/** Persist TOTP secret on the platform user (skips Redis setup flow). */
export async function applySeedTwoFactor(
  userId: import('mongoose').Types.ObjectId | string,
  email: string,
  fixedSecret?: string
): Promise<SeedTwoFactorResult> {
  const generated = speakeasy.generateSecret({
    length: 20,
    name: `Syntax Stories (${email})`,
    issuer: 'Syntax Stories',
  });

  const secret = (fixedSecret ?? generated.base32).replace(/\s/g, '').toUpperCase();
  const otpauthUrl = speakeasy.otpauthURL({
    secret,
    label: email,
    issuer: 'Syntax Stories',
    encoding: 'base32',
  });

  await UserModel.updateOne(
    { _id: userId },
    { $set: { twoFactorEnabled: true, twoFactorSecret: secret } }
  );

  return { secret, otpauthUrl };
}

/** Print QR + secret + live TOTP code for terminal-based dev setup. */
export async function printTwoFactorSeedBanner(
  email: string,
  secret: string,
  otpauthUrl: string
): Promise<void> {
  const qr = await QRCode.toString(otpauthUrl, { type: 'terminal', small: true });
  const code = speakeasy.totp({ secret, encoding: 'base32' });

  const line = '═'.repeat(52);
  console.log(`\n╔${line}╗`);
  console.log('║        ADMIN 2FA — SCAN QR OR USE SECRET BELOW       ║');
  console.log(`╚${line}╝`);
  console.log(`  Email:      ${email}`);
  console.log(`  TOTP secret: ${secret}`);
  console.log(`  Code now:    ${code}  (rotates every 30s)`);
  console.log('\n  Authenticator QR:\n');
  console.log(qr);
  console.log('\n  After login, enter the 6-digit code when prompted.\n');
}
