'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  MenuRounded as MenuIcon,
  MenuOpenRounded as MenuOpenIcon,
  LogoutRounded as LogoutIcon,
  SettingsRounded as SettingsIcon,
  KeyboardArrowDownRounded as ArrowDownIcon,
} from '@mui/icons-material';
import { fetchMe, type MeUser } from '@/lib/api';
import { useSessionStore } from '@/store/session';
import { mainNav } from './navConfig';

const DRAWER_W = 270;
const DRAWER_MINI_W = 80;
const TOOLBAR_H = 70;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const logout = useSessionStore((s) => s.logout);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetchMe(token).then((r) => {
      if (!cancelled) setUser(r.user);
    });
    return () => { cancelled = true; };
  }, [token]);

  const drawerWidth = collapsed && isMdUp ? DRAWER_MINI_W : DRAWER_W;

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Box sx={{ flexGrow: 1, px: 1.5, pt: 1.5, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {mainNav.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            
            return (
              <Tooltip key={href} title={collapsed && isMdUp ? label : ""} placement="right">
                <ListItemButton
                  component={Link}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    minHeight: 50,
                    borderRadius: 2.5,
                    mb: 0.8,
                    px: collapsed && isMdUp ? 0 : 2,
                    justifyContent: collapsed && isMdUp ? 'center' : 'flex-start',
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    '&:hover': {
                      bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.04),
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    minWidth: collapsed && isMdUp ? 0 : 38, 
                    color: 'inherit',
                    justifyContent: 'center'
                  }}>
                    <Icon fontSize="medium" />
                  </ListItemIcon>
                  {(!collapsed || !isMdUp) && (
                    <ListItemText 
                      primary={label} 
                      primaryTypographyProps={{ 
                        fontSize: '0.9rem', 
                        fontWeight: active ? 600 : 500,
                      }} 
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: '100%',
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, md: 3 }, gap: 1, minHeight: TOOLBAR_H }}>
          <IconButton
            edge="start"
            aria-label={isMdUp ? (collapsed ? 'Expand navigation' : 'Collapse navigation') : 'Open navigation'}
            onClick={() => (isMdUp ? setCollapsed(!collapsed) : setMobileOpen(true))}
            sx={{
              color: 'text.secondary',
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' },
            }}
          >
            {isMdUp ? (collapsed ? <MenuIcon /> : <MenuOpenIcon />) : <MenuIcon />}
          </IconButton>

          <Box
            component={Link}
            href="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'primary.main',
              mr: 1,
              flexShrink: 0,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
              Syntax Stories
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right side Profile */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                cursor: 'pointer',
                p: 0.5,
                pr: 1.5,
                borderRadius: 10,
                transition: '0.2s',
                '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.05) }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 38, 
                  height: 38, 
                  bgcolor: 'primary.main', 
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  boxShadow: `0 4px 8px ${alpha(theme.palette.primary.main, 0.25)}`
                }}
              >
                {(user?.fullName ?? user?.email ?? '?').charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user?.fullName ?? 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Admin Account
                </Typography>
              </Box>
              <ArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Box>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 4,
              sx: { mt: 1, minWidth: 220, borderRadius: 3, p: 1, border: '1px solid', borderColor: 'divider' }
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
               <Typography variant="subtitle2" noWrap>{user?.email}</Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <MenuItem onClick={() => setAnchorEl(null)} sx={{ borderRadius: 1.5, py: 1 }}>
              <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
              Settings
            </MenuItem>
            <MenuItem
              onClick={() => { logout(); router.replace('/login'); }}
              sx={{ borderRadius: 1.5, py: 1, color: 'error.main' }}
            >
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          flex: 1,
          mt: `${TOOLBAR_H}px`,
          minHeight: `calc(100vh - ${TOOLBAR_H}px)`,
          width: '100%',
        }}
      >
        <Box component="nav" sx={{ width: { xs: 0, md: drawerWidth }, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                width: DRAWER_W,
                borderRight: 'none',
                top: TOOLBAR_H,
                height: `calc(100% - ${TOOLBAR_H}px)`,
                boxSizing: 'border-box',
              },
            }}
          >
            {drawerContent}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': {
                position: 'fixed',
                left: 0,
                top: TOOLBAR_H,
                width: drawerWidth,
                height: `calc(100vh - ${TOOLBAR_H}px)`,
                boxSizing: 'border-box',
                borderRight: '1px solid',
                borderColor: 'divider',
                transition: theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
                overflowX: 'hidden',
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create('margin', {
            duration: theme.transitions.duration.standard,
          }),
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 6 },
            maxWidth: 1400,
            width: '100%',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
    </Box>
  );
}