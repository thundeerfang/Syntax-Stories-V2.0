'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  useMediaQuery,
  useTheme,
  alpha,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import { fetchMe, type MeUser } from '@/lib/api';
import { isAdminAuthActive, resolveAdminApiToken } from '@/lib/auth/adminAuthSession';
import { useSessionStore } from '@/store/session';
import { AdminLogo } from '@/components/layout/AdminLogo';
import { AccountMenu } from '@/components/layout/AccountMenu';
import { NavbarUserSearch } from '@/components/layout/NavbarUserSearch';
import { NavbarNotifications } from '@/components/layout/NavbarNotifications';
import { NavbarSettingsButton } from '@/components/layout/NavbarSettingsButton';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminFixedShell, ADMIN_TOOLBAR_H } from '@/components/layout/AdminFixedShell';
import { filterNavByPermissions, mainNav } from './navConfig';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const token = useSessionStore((s) => s.token);
  const httpOnlyCookies = useSessionStore((s) => s.httpOnlyCookies);
  const apiToken = resolveAdminApiToken(token, httpOnlyCookies);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const permissions = useSessionStore((s) => s.permissions);
  const visibleNav = filterNavByPermissions(mainNav, hasPermission, permissions.length > 0);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);

  useEffect(() => {
    if (!isAdminAuthActive(token, httpOnlyCookies)) return;
    let cancelled = false;
    void fetchMe(apiToken).then((r) => {
      if (!cancelled) setUser(r.user);
    });
    return () => {
      cancelled = true;
    };
  }, [token, httpOnlyCookies, apiToken]);

  const header = (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: ADMIN_TOOLBAR_H, px: { xs: 1.5, md: 2 }, gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <IconButton
            edge="start"
            aria-label={isMdUp ? 'Toggle sidebar' : 'Open menu'}
            onClick={() => (isMdUp ? setCollapsed((c) => !c) : setMobileOpen(true))}
            sx={{ color: 'text.secondary', ml: -0.5 }}
          >
            {isMdUp && !collapsed ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
          </IconButton>
          <AdminLogo variant="horizontal" height={38} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 8 }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Suspense fallback={null}>
            <NavbarUserSearch />
          </Suspense>
          <NavbarSettingsButton />
          <NavbarNotifications />
          <AccountMenu user={user} />
        </Box>
      </Toolbar>
    </AppBar>
  );

  const sidebar = (
    <AdminSidebar
      items={visibleNav}
      collapsed={collapsed && isMdUp}
      mobileOpen={mobileOpen}
      onMobileClose={() => setMobileOpen(false)}
    />
  );

  return (
    <AdminFixedShell header={header} sidebar={sidebar}>
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1.5, sm: 2 },
          width: '100%',
          minHeight: '100%',
        }}
      >
        {children}
      </Box>
    </AdminFixedShell>
  );
}
