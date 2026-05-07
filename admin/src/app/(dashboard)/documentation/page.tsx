'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import NextLink from 'next/link';
import { AdminDialog } from '@/components/ui/AdminDialog';

export default function DocumentationPage() {
  const [conventionsOpen, setConventionsOpen] = useState(false);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800} className="tracking-tight" gutterBottom>
          Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-2xl">
          Internal reference aligned with the platform blueprint: CMS boundaries, public vs admin APIs, and publishing
          safety. Subpages cover architecture, workflow, and contracts.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
        <Button component={NextLink} href="/documentation/architecture" variant="outlined" size="medium">
          Architecture
        </Button>
        <Button component={NextLink} href="/documentation/cms-workflow" variant="outlined" size="medium">
          CMS workflow
        </Button>
        <Button component={NextLink} href="/documentation/api-contracts" variant="outlined" size="medium">
          API contracts
        </Button>
        <Button component={NextLink} href="/documentation/publishing" variant="outlined" size="medium">
          Publishing
        </Button>
        <Button
          startIcon={<MenuBookRoundedIcon />}
          variant="contained"
          size="medium"
          onClick={() => setConventionsOpen(true)}
        >
          UI conventions
        </Button>
      </Stack>

      <AdminDialog
        open={conventionsOpen}
        onClose={() => setConventionsOpen(false)}
        title="Admin UI conventions"
        maxWidth="sm"
        primaryButton={{ label: 'Done', onClick: () => setConventionsOpen(false) }}
      >
        <Typography variant="body2" color="text.secondary" paragraph>
          Use <strong>AdminBreadcrumb</strong> on nested documentation routes. Use{' '}
          <strong>AdminDialog</strong> for confirmations and forms: dark overlay, titled header with close, and footer
          actions via <code>primaryButton</code> / <code>secondaryButton</code> or a custom <code>footer</code> node.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Public product documentation for end users lives in the webapp at <code>/docs</code>, fed by help articles with
          category <code>documentation</code>.
        </Typography>
      </AdminDialog>

      <Card elevation={0} className="border border-[var(--color-border)]" sx={{ borderColor: 'divider' }}>
        <CardContent className="p-6">
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Blueprint source
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mb-2">
            Monorepo file{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              docs/PLATFORM_DOCUMENTATION_AND_ADMIN_CMS_BLUEPRINT.md
            </code>{' '}
            is the canonical spec for help/CMS, RBAC, workers, and caching.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" className="flex items-center gap-1">
            <OpenInNewRoundedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
            Keep the repo copy in sync when processes change.
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} className="border border-dashed border-[var(--color-border)]" sx={{ borderColor: 'divider' }}>
        <CardContent className="p-6">
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Quick links
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" className="list-disc pl-5">
            <li>
              <MuiLink component={NextLink} href="/help" underline="hover">
                Help articles (CMS)
              </MuiLink>
            </li>
            <li>Staff roles: enforced on the API — editor vs admin</li>
            <li>Public help: GET /api/v1/help/* — Admin: /api/v1/admin/help/*</li>
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
