'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import type { AdminUserDetail } from '@/admin';

export type UserAccountActionsCardProps = {
  user: AdminUserDetail;
  busy?: boolean;
  canImpersonate?: boolean;
  onLock: () => void;
  onUnlock: () => void;
  onRevoke: () => void;
  onImpersonate?: () => void;
};

export function UserAccountActionsCard({
  user,
  busy = false,
  canImpersonate = false,
  onLock,
  onUnlock,
  onRevoke,
  onImpersonate,
}: UserAccountActionsCardProps) {
  const theme = useTheme();

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        position: { lg: 'sticky' },
        top: { lg: 'calc(var(--navbar-height, 64px) + 20px)' },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.18 : 0.1),
              color: 'warning.main',
            }}
          >
            <GppMaybeRoundedIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} letterSpacing="-0.01em">
              Account actions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Security & session controls
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={1}>
          <Button
            fullWidth
            variant="outlined"
            color="warning"
            size="medium"
            disabled={busy || !user.isActive}
            startIcon={<LockRoundedIcon />}
            onClick={onLock}
            sx={{ justifyContent: 'flex-start', py: 1.1 }}
          >
            Lock account
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="medium"
            disabled={busy || user.isActive}
            startIcon={<LockOpenRoundedIcon />}
            onClick={onUnlock}
            sx={{ justifyContent: 'flex-start', py: 1.1 }}
          >
            Unlock account
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            size="medium"
            disabled={busy}
            startIcon={<LogoutRoundedIcon />}
            onClick={onRevoke}
            sx={{ justifyContent: 'flex-start', py: 1.1 }}
          >
            Revoke all sessions
          </Button>

          {canImpersonate && !user.staffRole && onImpersonate ? (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Button
                fullWidth
                variant="contained"
                color="warning"
                size="medium"
                disabled={busy}
                onClick={onImpersonate}
                sx={{ justifyContent: 'flex-start', py: 1.1 }}
              >
                Impersonate user
              </Button>
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
