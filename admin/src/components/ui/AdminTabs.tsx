'use client';

import type { ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import { Box, Tab, Tabs, type SxProps, type Theme } from '@mui/material';

export type AdminTabItem = {
  label: string;
  icon?: SvgIconComponent;
};

export type AdminTabsProps = {
  tabs: AdminTabItem[];
  value: number;
  onChange: (index: number) => void;
  children: ReactNode;
  panelSx?: SxProps<Theme>;
};

/** Horizontal tabs without a card wrapper — optional icon per tab. */
export function AdminTabs({ tabs, value, onChange, children, panelSx }: AdminTabsProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={value}
        onChange={(_, v) => onChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 48,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 48,
            fontSize: '0.9375rem',
            px: { xs: 1.25, sm: 2 },
            gap: 1,
            minWidth: { xs: 'auto', sm: 120 },
          },
          '& .MuiTab-iconWrapper': {
            marginRight: 0,
          },
          '& .MuiTabs-indicator': {
            height: 2,
            borderRadius: '2px 2px 0 0',
          },
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.label}
              label={tab.label}
              disableRipple
              icon={Icon ? <Icon sx={{ fontSize: 20 }} /> : undefined}
              iconPosition="start"
            />
          );
        })}
      </Tabs>

      <Box
        sx={{
          pt: { xs: 2, sm: 2.5 },
          ...panelSx,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
