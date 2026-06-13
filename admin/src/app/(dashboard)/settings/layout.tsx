'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import { CentricPageHeader } from '@/components/layout/CentricPageHeader';
import { pageBreadcrumbs } from '@/components/layout/pageHeaderBreadcrumbs';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { settingsNav } from './settingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const pathname = usePathname() ?? '';

  return (
    <Stack spacing={3}>
      <CentricPageHeader
        title="Settings"
        description="Manage your operator profile, security, and access configuration."
        icon={<SettingsRoundedIcon />}
        breadcrumbs={pageBreadcrumbs('Settings', '/settings')}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            position: { md: 'sticky' },
            top: 16,
          }}
        >
          <List disablePadding sx={{ py: 0.5 }}>
            {settingsNav.map(({ label, href, Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <ListItemButton
                  key={href}
                  component={Link}
                  href={href}
                  sx={{
                    mx: 0.75,
                    my: 0.25,
                    borderRadius: 1.5,
                    color: active ? 'primary.main' : 'text.secondary',
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 700 : 600,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Box>
    </Stack>
  );
}
