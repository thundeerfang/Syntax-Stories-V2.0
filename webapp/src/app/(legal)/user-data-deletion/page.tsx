import type { Metadata } from 'next';
import { fetchPublishedLegalPolicy } from '@/lib/publicLegal';
import { LegalPolicyDocument } from '@/components/legal/LegalPolicyDocument';
import { LegalPolicyUnavailable } from '@/components/legal/LegalPolicyUnavailable';
import { UserDataDeletionPanel } from '@/components/legal/UserDataDeletionPanel';

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
