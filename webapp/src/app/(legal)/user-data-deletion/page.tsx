import type { Metadata } from 'next';
import { fetchPublishedLegalPolicy } from '@/lib/api/publicLegal';
import { LegalPolicyDocument } from '@/features/legal';
import { LegalPolicyUnavailable } from '@/features/legal';
import { UserDataDeletionPanel } from '@/features/legal';

export async function generateMetadata(): Promise<Metadata> {
  const data = await fetchPublishedLegalPolicy('udd');
  if (!data) return { title: 'User Data Deletion — Syntax Stories' };
  return {
    title: `${data.title} — Syntax Stories`,
    description: data.summary || 'User Data Deletion',
    alternates: { canonical: '/user-data-deletion' },
  };
}

export default async function UserDataDeletionPage() {
  const data = await fetchPublishedLegalPolicy('udd');
  if (!data) return <LegalPolicyUnavailable title="User Data Deletion" />;
  return (
    <div className="space-y-0">
      <LegalPolicyDocument data={data} />
      <UserDataDeletionPanel />
    </div>
  );
}
