'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { documentationTabHref } from '@/lib/documentation/documentationTabs';
import { getDocsAppUrl } from '@/lib/documentation/docsAppUrl';

export function DocumentationOverviewPanel() {
  const docsAppUrl = getDocsAppUrl();
  const [conventionsOpen, setConventionsOpen] = useState(false);

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          component={Link}
          href={documentationTabHref('api-contracts')}
          variant="contained"
          size="small"
        >
          API contracts
        </Button>
        {docsAppUrl ? (
          <Button
            component="a"
            href={docsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outlined"
            size="small"
            startIcon={<OpenInNewRoundedIcon />}
          >
            Docs webapp
          </Button>
        ) : null}
        <Button variant="outlined" size="small" onClick={() => setConventionsOpen(true)}>
          Publishing surfaces
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Product documentation is managed separately from the help center. Use this hub for platform
        architecture, API contracts, and publishing reference — not for editing help articles.
      </Typography>

      <AdminDialog
        open={conventionsOpen}
        onClose={() => setConventionsOpen(false)}
        title="Publishing surfaces"
        maxWidth="sm"
        primaryButton={{ label: 'Done', onClick: () => setConventionsOpen(false) }}
      >
        <Typography variant="body2" color="text.secondary" paragraph>
          Product docs use <code>/docs/&lt;slug&gt;</code> on the webapp and docs-webapp. Help center
          articles use <code>/help</code> and are managed only from <strong>FAQ</strong> in the
          sidebar.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure origins via <code>NEXT_PUBLIC_DOCS_APP_URL</code>,{' '}
          <code>NEXT_PUBLIC_WEBAPP_URL</code>, and <code>NEXT_PUBLIC_API_BASE_URL</code>.
        </Typography>
      </AdminDialog>
    </Stack>
  );
}
