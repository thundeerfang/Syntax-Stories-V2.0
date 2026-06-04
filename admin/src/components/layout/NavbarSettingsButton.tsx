'use client';

import { useRouter, usePathname } from 'next/navigation';
import { IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { navbarIconButtonSx } from './navbarIconButtonSx';

export function NavbarSettingsButton() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const active = pathname.startsWith('/settings') || pathname.startsWith('/security');

  return (
    <Tooltip title="Settings">
      <IconButton
        aria-label="Settings"
        onClick={() => router.push('/settings')}
        sx={{
          ...navbarIconButtonSx(theme),
          ...(active && {
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
          }),
        }}
      >
        <SettingsRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
