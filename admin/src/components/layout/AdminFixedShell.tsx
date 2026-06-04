'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export const ADMIN_TOOLBAR_H = 64;

type AdminFixedShellProps = {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
};

/**
 * Fixed viewport shell: header + sidebar stay in place; only `children` scroll.
 */
export function AdminFixedShell({ header, sidebar, children }: AdminFixedShellProps) {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        {header}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box
          component="aside"
          sx={{
            flexShrink: 0,
            height: '100%',
            display: { xs: 'none', md: 'block' },
            overflow: 'hidden',
          }}
        >
          {sidebar}
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
