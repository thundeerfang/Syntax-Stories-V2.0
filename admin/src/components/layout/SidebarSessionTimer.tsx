'use client';

import { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import PhonelinkLockRoundedIcon from '@mui/icons-material/PhonelinkLockRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import {
  ADMIN_IDLE_STEP_UP_MS,
  ADMIN_STEP_UP_GRACE_MS,
  formatSessionCountdown,
} from '@/lib/auth/adminIdleSession';
import { useSessionStore } from '@/store/session';

const TICK_MS = 1000;

export function SidebarSessionTimer({ collapsed }: { collapsed: boolean }) {
  const theme = useTheme();
  const stepUpRequired = useSessionStore((s) => s.stepUpRequired);
  const idleDeadlineAt = useSessionStore((s) => s.idleDeadlineAt);
  const stepUpGraceDeadlineAt = useSessionStore((s) => s.stepUpGraceDeadlineAt);
  const idleLimitSeconds = useSessionStore((s) => s.idleLimitSeconds);
  const graceLimitSeconds = useSessionStore((s) => s.graceLimitSeconds);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (idleDeadlineAt === null) return null;

  const idleLimitMs = (idleLimitSeconds ?? ADMIN_IDLE_STEP_UP_MS / 1000) * 1000;
  const graceLimitMs = (graceLimitSeconds ?? ADMIN_STEP_UP_GRACE_MS / 1000) * 1000;

  const remainingMs = stepUpRequired
    ? Math.max(0, (stepUpGraceDeadlineAt ?? now) - now)
    : Math.max(0, idleDeadlineAt - now);

  const label = stepUpRequired ? 'Confirm 2FA within' : 'Session locks in';
  const Icon = stepUpRequired ? PhonelinkLockRoundedIcon : TimerOutlinedIcon;
  const tone = stepUpRequired ? theme.palette.warning.main : theme.palette.text.secondary;

  if (collapsed) {
    return (
      <Box sx={{ px: 0.75, pb: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            py: 1,
            display: 'flex',
            justifyContent: 'center',
            borderRadius: 2,
            borderColor: stepUpRequired ? alpha(theme.palette.warning.main, 0.45) : 'divider',
            bgcolor: stepUpRequired
              ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)
              : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          <Icon sx={{ fontSize: 20, color: tone }} />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 0.75, pb: 1, mt: 'auto' }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          borderRadius: 2,
          borderColor: stepUpRequired ? alpha(theme.palette.warning.main, 0.45) : 'divider',
          bgcolor: stepUpRequired
            ? alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)
            : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(tone, 0.12),
              color: tone,
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>
              {label}
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              fontFamily="ui-monospace, monospace"
              color={stepUpRequired ? 'warning.main' : 'text.primary'}
            >
              {formatSessionCountdown(remainingMs)}
            </Typography>
            {!stepUpRequired ? (
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
                {Math.round(idleLimitMs / 60_000)} min idle limit
              </Typography>
            ) : (
              <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
                OTP or Touch ID · {Math.round(graceLimitMs / 60_000)} min to respond
              </Typography>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
