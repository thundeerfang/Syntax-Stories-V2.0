'use client';

import Link from 'next/link';
import { HelpFaqSection, type HelpHubConfig } from '@/components/help/HelpFaqSection';
import { blockShadowButtonClassNames } from '@/components/ui';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';

const SIGN_IN_CONFIG: HelpHubConfig = {
  title: 'Trouble signing in?',
  description: 'Common sign-in issues and what to try before contacting support.',
  supportLinkLabel: 'Contact support',
  supportLinkHref: '/contact',
  headerIcon: 'key',
  emptyTitle: 'Trouble signing in?',
  emptyDescription:
    'If you forgot your email or are having trouble signing in, use the same email you used when you created your account. You can also reset your password from the sign-in page.',
};

export default function SignInHelpPage() {
  return (
    <div className="w-full">
      <HelpFaqSection
        config={SIGN_IN_CONFIG}
        staticItems={[
          {
            id: 'sign-in-help',
            title: 'How do I sign in?',
            body: 'Use the email and password for your Syntax Stories account on the sign-in page.',
            summary: '',
            icon: 'mail',
          },
        ]}
      />
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, '-mt-10 pb-16')}>
        <Link
          href="/login"
          className={blockShadowButtonClassNames({ variant: 'primary', size: 'md' })}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
