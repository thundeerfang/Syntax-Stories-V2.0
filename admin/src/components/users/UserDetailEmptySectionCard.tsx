'use client';

import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';

export type UserDetailEmptySectionCardProps = {
  title: string;
  icon: ReactNode;
  emptyMessage?: string;
  children?: ReactNode;
};

export function UserDetailEmptySectionCard({
  title,
  icon,
  emptyMessage = 'No data yet.',
  children,
}: UserDetailEmptySectionCardProps) {
  const theme = useTheme();
  const hasContent = Boolean(children);

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
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
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: hasContent ? 1.5 : 0.5 }}>
          {title}
        </Typography>
        {hasContent ? (
          children
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
