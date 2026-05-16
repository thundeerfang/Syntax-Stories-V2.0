import type { ReactNode } from 'react';
import { LegalPagesLayout } from '@/features/legal';


export default function LegalSectionLayout({ children }: { children: ReactNode }) {
  return <LegalPagesLayout>{children}</LegalPagesLayout>;
}
