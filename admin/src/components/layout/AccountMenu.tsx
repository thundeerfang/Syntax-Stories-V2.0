'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { DarkModeRounded, LightModeRounded, LogoutRounded } from '@mui/icons-material';
import type { MeUser } from '@/lib/api';
import { useColorMode } from '@/theme/colorMode';
import { useSessionStore } from '@/store/session';

type AccountMenuProps = {
  user: MeUser | null;
};

function isSuperAdminRole(roleName: string | null): boolean {
  return roleName?.toLowerCase() === 'super admin';
}

export function AccountMenu({ user }: AccountMenuProps) {
  const theme = useTheme();
  const router = useRouter();
  const { mode, toggleColorMode } = useColorMode();
  const roleName = useSessionStore((s) => s.roleName);
  const logout = useSessionStore((s) => s.logout);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const superAdmin = isSuperAdminRole(roleName);
  const displayName = user?.fullName ?? 'Operator';
  const initial = displayName.charAt(0).toUpperCase();

  const roleBadgeSx = superAdmin
    ? {
        bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.22 : 0.14),
        color: 'text.secondary',
        border: '1px solid',
        borderColor: alpha(theme.palette.grey[500], 0.35),
      }
    : {
        bgcolor: alpha(theme.palette.primary.main, 0.12),
        color: 'primary.main',
        border: '1px solid',
        borderColor: alpha(theme.palette.primary.main, 0.2),
      };

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="Open account menu"
          sx={{
            p: 0.5,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.12 : 0.08),
            '&:hover': {
              bgcolor: alpha(theme.palette.grey[500], theme.palette.mode === 'dark' ? 0.18 : 0.12),
            },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ pl: 0.25, pr: roleName ? 1 : 0.25 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: superAdmin ? '2px dashed' : '2px solid transparent',
                borderColor: superAdmin ? alpha(theme.palette.grey[500], 0.5) : 'transparent',
              }}
            >
              {initial}
            </Avatar>
            {roleName ? (
              <Box
                component="span"
                sx={{
                  ...roleBadgeSx,
                  px: 1,
                  py: 0.35,
                  borderRadius: 999,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  maxWidth: 100,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {roleName}
              </Box>
            ) : null}
          </Stack>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: 1,
              width: 320,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {displayName}
          </Typography>
          {user?.email ? (
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ px: 2, pb: 1.5 }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {roleName ? (
              <Chip
                label={roleName}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: 999,
                  ...roleBadgeSx,
                }}
              />
            ) : null}
            {user?.staffRole ? (
              <Chip
                label={user.staffRole}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 999 }}
              />
            ) : null}
          </Stack>
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={() => toggleColorMode()} sx={{ borderRadius: 1.5, mx: 1, mt: 0.5 }}>
          <ListItemIcon>
            {mode === 'dark' ? (
              <LightModeRounded fontSize="small" />
            ) : (
              <DarkModeRounded fontSize="small" />
            )}
          </ListItemIcon>
          {mode === 'dark' ? 'Light mode' : 'Dark mode'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            logout();
            router.replace('/login');
          }}
          sx={{ borderRadius: 1.5, mx: 1, mb: 1, color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
