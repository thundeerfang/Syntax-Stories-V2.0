'use client';

import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Stack } from '@mui/material';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import ApiRoundedIcon from '@mui/icons-material/ApiRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import { AdminTabs } from '@/components/ui/AdminTabs';
import {
  DOCUMENTATION_TAB_KEYS,
  documentationTabFromQuery,
  documentationTabHref,
  type DocumentationTabKey,
} from '@/lib/documentation/documentationTabs';
import { DocumentationOverviewPanel } from './DocumentationOverviewPanel';
import { DocumentationArchitecturePanel } from './DocumentationArchitecturePanel';
import { DocumentationCmsWorkflowPanel } from './DocumentationCmsWorkflowPanel';
import { DocumentationApiContractsPanel } from './DocumentationApiContractsPanel';
import { DocumentationPublishingPanel } from './DocumentationPublishingPanel';

const TAB_LABELS: Record<DocumentationTabKey, string> = {
  overview: 'Overview',
  architecture: 'Architecture',
  'cms-workflow': 'CMS workflow',
  'api-contracts': 'API contracts',
  publishing: 'Publishing',
};

const TAB_ICONS = {
  overview: MenuBookRoundedIcon,
  architecture: AccountTreeRoundedIcon,
  'cms-workflow': SyncAltRoundedIcon,
  'api-contracts': ApiRoundedIcon,
  publishing: PublishRoundedIcon,
} as const;

const TAB_PANELS: Record<DocumentationTabKey, ReactNode> = {
  overview: <DocumentationOverviewPanel />,
  architecture: <DocumentationArchitecturePanel />,
  'cms-workflow': <DocumentationCmsWorkflowPanel />,
  'api-contracts': <DocumentationApiContractsPanel />,
  publishing: <DocumentationPublishingPanel />,
};

export function DocumentationHub() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = documentationTabFromQuery(searchParams.get('tab'));
  const tabIndex = DOCUMENTATION_TAB_KEYS.indexOf(tab);

  const tabs = useMemo(
    () =>
      DOCUMENTATION_TAB_KEYS.map((key) => ({
        label: TAB_LABELS[key],
        icon: TAB_ICONS[key],
      })),
    []
  );

  const onTabChange = useCallback(
    (index: number) => {
      const key = DOCUMENTATION_TAB_KEYS[index] ?? 'overview';
      router.replace(documentationTabHref(key), { scroll: false });
    },
    [router]
  );

  return (
    <Stack spacing={2}>
      <CentricPageHeader
        title="Documentation"
        description="Internal platform notes, API contracts, CMS workflow, and publishing reference."
        icon={<MenuBookRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Documentation', '/documentation')}
      />

      <AdminTabs
        tabs={tabs}
        value={tabIndex < 0 ? 0 : tabIndex}
        onChange={onTabChange}
      >
        {TAB_PANELS[DOCUMENTATION_TAB_KEYS[tabIndex < 0 ? 0 : tabIndex] ?? 'overview']}
      </AdminTabs>
    </Stack>
  );
}
