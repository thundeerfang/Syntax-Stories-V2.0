'use client';

import { useState } from 'react';
import { Box, Paper, Tab, Tabs } from '@mui/material';
import { RolesCrudSection } from './RolesCrudSection';
import { CatalogSlugCrudSection } from './CatalogSlugCrudSection';
import { PermissionsCrudSection } from './PermissionsCrudSection';

export function AccessControlPanel({ token }: { token: string | null }) {
  const [sub, setSub] = useState(0);

  if (!token) return null;

  return (
    <Paper
      elevation={0}
      className="border border-[var(--color-border)]"
      sx={{ borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      <Tabs
        value={sub}
        onChange={(_, v) => setSub(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 44 },
        }}
      >
        <Tab label="Roles" disableRipple />
        <Tab label="Resources" disableRipple />
        <Tab label="Actions" disableRipple />
        <Tab label="Scope types" disableRipple />
        <Tab label="Permissions" disableRipple />
      </Tabs>
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        {sub === 0 ? <RolesCrudSection token={token} /> : null}
        {sub === 1 ? <CatalogSlugCrudSection token={token} variant="resources" /> : null}
        {sub === 2 ? <CatalogSlugCrudSection token={token} variant="actions" /> : null}
        {sub === 3 ? <CatalogSlugCrudSection token={token} variant="scopes" /> : null}
        {sub === 4 ? <PermissionsCrudSection token={token} /> : null}
      </Box>
    </Paper>
  );
}
