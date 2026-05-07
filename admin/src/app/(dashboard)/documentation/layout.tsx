'use client';

import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import { AdminBreadcrumb, type BreadcrumbItem } from '@/components/ui/AdminBreadcrumb';

const SUB_LABELS: Record<string, string> = {
  architecture: 'Architecture & layers',
  'cms-workflow': 'CMS workflow',
  'api-contracts': 'API contracts',
  publishing: 'Publishing & versions',
};

function breadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const segs = pathname.split('/').filter(Boolean);
  if (segs[0] !== 'documentation') return [];
  if (segs.length === 1) {
    return [{ label: 'Documentation' }];
  }
  const sub = segs[1] ?? '';
  const label = SUB_LABELS[sub] ?? sub.replace(/-/g, ' ');
  return [
    { label: 'Documentation', href: '/documentation' },
    { label: label.charAt(0).toUpperCase() + label.slice(1) },
  ];
}

export default function DocumentationSectionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const items = breadcrumbsForPath(pathname);

  return (
    <Box>
      <AdminBreadcrumb items={items} />
      {children}
    </Box>
  );
}
