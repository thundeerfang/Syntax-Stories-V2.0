import type { Metadata } from 'next';
import { fetchPublishedLegalPolicy } from '@/lib/api/publicLegal';
import { LegalPolicyDocument } from '@/features/legal';
import { LegalPolicyUnavailable } from '@/features/legal';

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPublishedLegalPolicy('privacy');
  if (!data) return { title: 'Privacy Policy — Syntax Stories' };
  return {
    title: `${data.title} — Syntax Stories`,
    description: data.summary || 'Privacy Policy',
    alternates: { canonical: '/privacy' },
  };
}

export default async function PrivacyPage() {
  const data = await fetchPublishedLegalPolicy('privacy');
  if (!data) return <LegalPolicyUnavailable title="Privacy Policy" />;
  return <LegalPolicyDocument data={data} />;
}
