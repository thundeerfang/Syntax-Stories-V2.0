'use client';

import type { ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
} from '@mui/material';

export type AdminSidebarNavItem = {
  label: string;
  icon: SvgIconComponent;
};

export type AdminSidebarNavProps = {
  items: AdminSidebarNavItem[];
  value: number;
  onChange: (index: number) => void;
  children: ReactNode;
  /** Left column width on md+ */
  sidebarWidth?: number;
};

/** Vertical nav on the left; panel content on the right — no card wrapper. */
export function AdminSidebarNav({
  items,
  value,
  onChange,
  children,
  sidebarWidth = 220,
}: AdminSidebarNavProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: `${sidebarWidth}px 1fr` },
        gap: { xs: 2, md: 3 },
        alignItems: 'start',
      }}
    >
      <List
        disablePadding
        sx={{
          display: { xs: 'flex', md: 'block' },
          flexDirection: { xs: 'row', md: 'column' },
          overflowX: { xs: 'auto', md: 'visible' },
          gap: 0.5,
          pb: { xs: 0.5, md: 0 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
        }}
      >
        {items.map((item, index) => {
          const active = value === index;
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.label}
              selected={active}
              onClick={() => onChange(index)}
              sx={{
                flexShrink: { xs: 0, md: 1 },
                borderRadius: 1.5,
                mb: { md: 0.25 },
                minHeight: 44,
                color: active ? 'primary.main' : 'text.secondary',
                bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '&:hover': {
                  bgcolor: active
                    ? alpha(theme.palette.primary.main, 0.14)
                    : alpha(theme.palette.primary.main, 0.06),
                },
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <Icon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: active ? 700 : 600,
                  noWrap: true,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}
