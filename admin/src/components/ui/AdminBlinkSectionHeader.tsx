'use client';

import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type AdminBlinkSectionHeaderProps = {
  title: string;
  /** Search fields, actions, switches — aligned to the right. */
  right?: ReactNode;
};

/** Section title with animated status dot (left) and optional toolbar (right). */
export function AdminBlinkSectionHeader({ title, right }: AdminBlinkSectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.5, sm: 2 }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      useFlexGap
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ flexShrink: 0 }}>
        <Box className="admin-blink-dot" aria-hidden />
        <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.01em">
          {title}
        </Typography>
      </Stack>
      {right ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            flexWrap: 'wrap',
            gap: 1,
            flex: { sm: '1 1 auto' },
            minWidth: { sm: 200 },
          }}
        >
          {right}
        </Box>
      ) : null}
    </Stack>
  );
}
