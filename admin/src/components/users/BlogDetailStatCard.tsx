'use client';

import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export type BlogDetailStatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  mono?: boolean;
  empty?: boolean;
};

function isEmptyDisplayValue(value: ReactNode): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') {
    const t = value.trim();
    return !t || t === '—' || t === 'NaN' || t.toLowerCase() === 'nan';
  }
  return false;
}

export function BlogDetailStatCard({
  label,
  value,
  icon,
  mono = false,
  empty: emptyProp,
}: BlogDetailStatCardProps) {
  const theme = useTheme();
  const empty = emptyProp ?? isEmptyDisplayValue(value);

  if (empty) {
    return (
      <Card
        elevation={0}
        sx={{
          height: '100%',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: alpha(theme.palette.text.secondary, theme.palette.mode === 'dark' ? 0.08 : 0.05),
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
              bgcolor: alpha(theme.palette.text.secondary, 0.12),
              color: 'text.disabled',
              '& svg': { fontSize: 22 },
            }}
          >
            <CloseRoundedIcon />
          </Box>
          <Typography
            variant="caption"
            color="text.disabled"
            fontWeight={600}
            sx={{ display: 'block', mb: 0.5, letterSpacing: '0.02em' }}
          >
            {label}
          </Typography>
          <Typography variant="body2" color="text.disabled" fontWeight={500}>
            No data
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
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
