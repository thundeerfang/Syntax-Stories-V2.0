import type { AdminUserDetail } from '@/admin';

export function emailVerificationDisplay(user: AdminUserDetail): {
  verified: boolean;
  label: string;
  detail?: string;
} {
  const effective = user.emailVerifiedEffective ?? user.emailVerified;
  const providers = user.oauthProviderLabels ?? [];

  if (user.emailVerificationSource === 'oauth' && effective) {
    const via = providers.length > 0 ? providers.join(', ') : 'OAuth';
    return {
      verified: true,
      label: 'Email verified (OAuth)',
      detail: `Identity confirmed via ${via}. OAuth providers verify email at sign-in.`,
    };
  }
  if (effective) {
    return {
      verified: true,
      label: 'Email verified',
      detail: user.emailVerified ? 'Marked verified in account records.' : undefined,
    };
  }
  return {
    verified: false,
    label: 'Email unverified',
    detail: 'No verified email flag and no linked OAuth provider.',
  };
}
