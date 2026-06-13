'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';

export type AdminPanelEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
};

export function AdminPanelEmptyState({ icon, title, description }: AdminPanelEmptyStateProps) {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        py: 4,
        px: 3,
        borderRadius: 2,
        textAlign: 'center',
        bgcolor: alpha(theme.palette.text.secondary, theme.palette.mode === 'dark' ? 0.06 : 0.04),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 1.5,
          color: 'text.disabled',
          '& svg': { fontSize: 40 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" fontWeight={600} color="text.secondary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
    </Paper>
  );
}
