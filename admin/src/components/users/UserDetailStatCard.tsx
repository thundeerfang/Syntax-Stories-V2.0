'use client';

import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';

export type UserDetailStatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  /** Use monospace / smaller text for IDs */
  mono?: boolean;
  onClick?: () => void;
};

export function UserDetailStatCard({
  label,
  value,
  icon,
  mono = false,
  onClick,
}: UserDetailStatCardProps) {
  const theme = useTheme();
  const clickable = Boolean(onClick);

  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        ...(clickable
          ? {
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.45),
                boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`,
              },
            }
          : {}),
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
            color: 'primary.main',
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ display: 'block', mb: 0.5, letterSpacing: '0.02em' }}
        >
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            lineHeight: 1.45,
            wordBreak: mono ? 'break-all' : 'normal',
            fontFamily: mono ? 'ui-monospace, monospace' : undefined,
            fontSize: mono ? '0.8125rem' : undefined,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
