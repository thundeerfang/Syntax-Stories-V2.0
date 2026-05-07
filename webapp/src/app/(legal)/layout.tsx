import type { ReactNode } from 'react';
import { LegalPagesLayout } from '@/components/legal/LegalPagesLayout';

export default function LegalSectionLayout({ children }: { children: ReactNode }) {
  return <LegalPagesLayout>{children}</LegalPagesLayout>;
}
