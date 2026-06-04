'use client';

import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { alpha } from '@mui/material/styles';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { OverviewIamMetrics } from '@/components/dashboard/OverviewIamMetrics';

const cards = [
  {
    title: 'FAQ',
    description: 'Manage FAQ items and page copy for the public /help section.',
    href: '/help',
    icon: HelpOutlineRoundedIcon,
    action: 'Open',
  },
  {
    title: 'Documentation',
    description: 'Internal platform notes, API contracts, and publishing reference.',
    href: '/documentation',
    icon: MenuBookRoundedIcon,
    action: 'Open',
  },
  {
    title: 'Soft delete center',
    description: 'Restore help articles, blog posts, or deactivated users from trash.',
    href: '/trash',
    icon: DeleteOutlineRoundedIcon,
    action: 'Open',
  },
  {
    title: 'Subscriptions',
    description: 'Predefined paid plans for the product.',
    href: '/subscriptions',
    icon: TrendingUpRoundedIcon,
    action: 'Open',
  },
];

export default function OverviewPage() {
  return (
    <Stack spacing={4}>
      <CentricPageHeader
        title="Overview"
        description="Welcome to the Syntax Stories admin console. Use the sidebar to move between sections, or jump in below."
        icon={<DashboardRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Overview')}
      />

      <OverviewIamMetrics />

      <Grid container spacing={2}>
        {cards.map(({ title, description, href, icon: Icon, action }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={href}>
            <Card
              elevation={0}
              className="h-full border border-[var(--color-border)] transition-shadow hover:shadow-md"
              sx={{ borderColor: 'divider', height: '100%' }}
            >
              <CardContent className="flex h-full flex-col p-4">
                <Box
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  sx={(theme) => ({
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                  })}
                >
                  <Icon color="primary" />
                </Box>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary" className="mb-4 flex-1">
                  {description}
                </Typography>
                <Button
                  component={Link}
                  href={href}
                  size="small"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {action}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card
        elevation={0}
        className="border border-dashed border-[var(--color-border)]"
        sx={{ borderColor: 'divider' }}
      >
        <CardContent className="p-6">
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Quick status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live metrics will appear here when billing and analytics APIs are connected. For now
            this dashboard is a structured shell for CMS and future admin tools.
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}
