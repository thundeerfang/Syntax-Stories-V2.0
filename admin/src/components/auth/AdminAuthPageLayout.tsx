'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

/** Full-viewport gradient backdrop for staff login and other auth pages. */
export function AdminAuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: (theme) =>
          `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.dark, 0.06)} 42%, ${theme.palette.background.default} 72%)`,
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          left: '-8rem',
          top: '12%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          bgcolor: (t) => alpha(t.palette.primary.main, 0.18),
          filter: 'blur(64px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'fixed',
          right: '-6rem',
          bottom: '8%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          bgcolor: (t) => alpha(t.palette.primary.light, 0.22),
          filter: 'blur(72px)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
