'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import type { NavEntry, NavItem } from '@/components/dashboard/navConfig';
import { isNavGroup, navGroupIdForPath } from '@/components/dashboard/navConfig';
import { SidebarSessionTimer } from '@/components/layout/SidebarSessionTimer';

const DRAWER_W = 220;
const DRAWER_MINI_W = 64;

type AdminSidebarProps = {
  items: NavEntry[];
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function NavLinkRow({
  item,
  pathname,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  nested?: boolean;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  const active = isActive(pathname, item.href);
  const { href, label, Icon } = item;

  return (
    <Tooltip title={collapsed ? label : ''} placement="right">
      <ListItemButton
        component={Link}
        href={href}
        onClick={onNavigate}
        sx={{
          minHeight: nested ? 40 : 44,
          mb: 0.5,
          pl: nested ? (collapsed ? 1.25 : 3.5) : collapsed ? 1.25 : 1.75,
          pr: collapsed ? 1.25 : 1.75,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 2,
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
          '&:hover': {
            bgcolor: active
              ? alpha(theme.palette.primary.main, 0.14)
              : alpha(theme.palette.primary.main, 0.06),
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : nested ? 32 : 36,
            color: 'inherit',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: nested ? 20 : 22 }} />
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: nested ? '0.8125rem' : '0.875rem',
              fontWeight: active ? 600 : 500,
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
}

function NavGroupRow({
  group,
  pathname,
  collapsed,
  open,
  onToggle,
  onNavigate,
}: {
  group: Extract<NavEntry, { type: 'group' }>;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const theme = useTheme();
  const childActive = group.children.some((c) => isActive(pathname, c.href));
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  if (collapsed) {
    return (
      <>
        <Tooltip title={group.label} placement="right">
          <ListItemButton
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{
              minHeight: 44,
              mb: 0.5,
              px: 1.25,
              justifyContent: 'center',
              borderRadius: 2,
              color: childActive ? 'primary.main' : 'text.secondary',
              bgcolor: childActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, color: 'inherit', justifyContent: 'center' }}>
              <group.Icon sx={{ fontSize: 22 }} />
            </ListItemIcon>
          </ListItemButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        >
          {group.children.map((child) => (
            <MenuItem
              key={child.href}
              component={Link}
              href={child.href}
              selected={isActive(pathname, child.href)}
              onClick={() => {
                setMenuAnchor(null);
                onNavigate();
              }}
              sx={{ gap: 1.5, minWidth: 180 }}
            >
              <child.Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
              {child.label}
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  return (
    <Box sx={{ mb: 0.25 }}>
      <ListItemButton
        onClick={onToggle}
        sx={{
          minHeight: 44,
          mb: 0.25,
          px: 1.75,
          borderRadius: 2,
          color: childActive ? 'primary.main' : 'text.secondary',
          bgcolor: childActive && !open ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
          <group.Icon sx={{ fontSize: 22 }} />
        </ListItemIcon>
        <ListItemText
          primary={group.label}
          primaryTypographyProps={{
            fontSize: '0.875rem',
            fontWeight: childActive ? 600 : 500,
          }}
        />
        <ExpandMoreRoundedIcon
          sx={{
            fontSize: 20,
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'text.disabled',
          }}
        />
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List disablePadding>
          {group.children.map((child) => (
            <NavLinkRow
              key={child.href}
              item={child}
              pathname={pathname}
              collapsed={false}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
}

export function AdminSidebar({ items, collapsed, mobileOpen, onMobileClose }: AdminSidebarProps) {
  const theme = useTheme();
  const pathname = usePathname() ?? '/';
  const drawerWidth = collapsed ? DRAWER_MINI_W : DRAWER_W;
  const activeGroupId = navGroupIdForPath(pathname);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => (prev[activeGroupId] ? prev : { ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const defaultOpen = useMemo(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of items) {
      if (isNavGroup(entry)) initial[entry.id] = entry.id === activeGroupId;
    }
    return initial;
  }, [items, activeGroupId]);

  const mergedOpen = { ...defaultOpen, ...openGroups };

  const navList = (
    <List disablePadding>
      {items.map((entry) => {
        if (isNavGroup(entry)) {
          return (
            <NavGroupRow
              key={entry.id}
              group={entry}
              pathname={pathname}
              collapsed={collapsed}
              open={Boolean(mergedOpen[entry.id])}
              onToggle={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [entry.id]: !mergedOpen[entry.id],
                }))
              }
              onNavigate={onMobileClose}
            />
          );
        }
        return (
          <NavLinkRow
            key={entry.href}
            item={entry}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onMobileClose}
          />
        );
      })}
    </List>
  );

  const desktopSidebar = (
    <Box
      sx={{
        width: drawerWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Box
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', py: 1.25, px: 0.75 }}
      >
        {navList}
      </Box>
      <SidebarSessionTimer collapsed={collapsed} />
    </Box>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_W,
            boxSizing: 'border-box',
            border: 'none',
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ flex: 1, overflowY: 'auto', py: 1.25, px: 0.75 }}>{navList}</Box>
          <SidebarSessionTimer collapsed={false} />
        </Box>
      </Drawer>

      <Box sx={{ display: { xs: 'none', md: 'block' }, height: '100%' }}>{desktopSidebar}</Box>
    </>
  );
}

export { DRAWER_W, DRAWER_MINI_W };
