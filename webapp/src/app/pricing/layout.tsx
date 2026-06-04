import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing — Syntax Stories',
  description:
    'Simple plans for Syntax Stories — the blogging platform for developers. Upgrade or change anytime.',
  alternates: { canonical: '/pricing' },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
